import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, getUserFromToken, unauthorized } from '@/lib/events-helpers';

export async function GET(req: NextRequest) {
  const user = await getUserFromToken(req);
  if (!user) return unauthorized();
  const admin = getAdmin();

  // Find user's active speed dating event
  const { data: checkins } = await admin.from('speed_checkins')
    .select('*, speed_events(*)')
    .eq('user_id', user.id)
    .in('speed_events.status', ['checkin', 'active', 'completed'])
    .order('speed_events(date)', { ascending: false });

  const checkin = (checkins || []).find((c: any) =>
    c.speed_events && ['checkin', 'active', 'completed'].includes(c.speed_events.status) &&
    (!c.speed_events.event_type || c.speed_events.event_type === 'speed_dating')
  );

  if (!checkin) return NextResponse.json({ active: false });

  const ev = (checkin as any).speed_events;
  const eventId = checkin.event_id;

  const { data: rounds } = await admin.from('speed_rounds').select('*').eq('event_id', eventId).order('round_number');
  const { data: pairings } = await admin.from('speed_pairings')
    .select('*, speed_rounds(round_number, status, started_at), speed_icebreakers(question)')
    .eq('event_id', eventId)
    .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
    .order('speed_rounds(round_number)');

  // Get partner info for each pairing
  const pairingsWithPartners = await Promise.all((pairings || []).map(async (p: any) => {
    const partnerId = p.user1_id === user.id ? p.user2_id : p.user1_id;
    const { data: partner } = await admin.from('users').select('first_name, age').eq('id', partnerId).single();
    return {
      ...p,
      partnerId,
      partnerName: partner?.first_name || 'Unknown',
      partnerAge: partner?.age,
      round_number: p.speed_rounds?.round_number,
      round_status: p.speed_rounds?.status,
      started_at: p.speed_rounds?.started_at,
      icebreaker: p.speed_icebreakers?.question,
    };
  }));

  const roundsList = rounds || [];
  const activeRound = roundsList.find((r: any) => r.status === 'active') || null;
  const votingRound = roundsList.find((r: any) => r.status === 'voting') || null;

  // Check voted rounds
  const roundIds = roundsList.map((r: any) => r.id);
  let votedRoundIds = new Set<string>();
  if (roundIds.length > 0) {
    const { data: voted } = await admin.from('speed_votes').select('round_id').eq('voter_id', user.id).in('round_id', roundIds);
    votedRoundIds = new Set((voted || []).map(v => v.round_id));
  }

  let currentPairing = null;
  if (activeRound) {
    currentPairing = pairingsWithPartners.find(p => p.round_id === activeRound.id) || null;
  }

  let nextParticipatingRound = null;
  if (activeRound && !currentPairing) {
    const future = pairingsWithPartners.find(p => p.round_number > activeRound.round_number);
    nextParticipatingRound = future?.round_number || null;
  }

  const oppositeGender = checkin.gender === 'male' ? 'female' : 'male';
  const { count: totalOpposites } = await admin.from('speed_checkins').select('*', { count: 'exact', head: true }).eq('event_id', eventId).eq('gender', oppositeGender);
  const uniquePartners = new Set(pairingsWithPartners.map(p => p.partnerId));

  return NextResponse.json({
    active: true,
    event: {
      id: eventId, name: ev.name, status: ev.status,
      roundDurationSeconds: ev.round_duration_seconds,
      venueName: ev.venue_name, city: ev.city, date: ev.date,
    },
    rounds: roundsList.map((r: any) => ({ ...r, voted: votedRoundIds.has(r.id) })),
    pairings: pairingsWithPartners,
    currentRound: activeRound,
    votingRound,
    currentPairing,
    nextParticipatingRound,
    isBye: activeRound ? !currentPairing : false,
    metEveryone: uniquePartners.size >= (totalOpposites || 0),
    metCount: uniquePartners.size,
    totalOpposites: totalOpposites || 0,
  });
}
