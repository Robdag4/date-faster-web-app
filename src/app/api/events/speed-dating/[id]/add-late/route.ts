import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, checkAdminAuth, unauthorized, notFound, badRequest } from '@/lib/events-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminAuth(req)) return unauthorized();
  const { id } = await params;
  const { userId } = await req.json();
  if (!userId) return badRequest('userId required');

  const admin = getAdmin();
  const { data: event } = await admin.from('speed_events').select('*').eq('id', id).single();
  if (!event) return notFound('Event not found');

  const { data: user } = await admin.from('users').select('id, first_name, gender').eq('id', userId).single();
  if (!user) return notFound('User not found');

  const { data: existing } = await admin.from('speed_checkins').select('id').eq('event_id', id).eq('user_id', userId).maybeSingle();
  if (existing) return NextResponse.json({ error: 'User already checked in' }, { status: 409 });

  const { data: allCheckins } = await admin.from('speed_checkins').select('seat_number').eq('event_id', id).order('seat_number', { ascending: false }).limit(1);
  const seatNum = ((allCheckins?.[0]?.seat_number) || 0) + 1;

  await admin.from('speed_checkins').insert({ event_id: id, user_id: userId, gender: user.gender, seat_number: seatNum, is_late_arrival: true });

  // Find opposite-gender people to pair with
  const oppositeGender = user.gender === 'male' ? 'female' : 'male';
  const { data: opposites } = await admin.from('speed_checkins').select('user_id').eq('event_id', id).eq('gender', oppositeGender);
  const oppositeIds = new Set((opposites || []).map(o => o.user_id));

  const { data: existingPairings } = await admin.from('speed_pairings').select('user1_id, user2_id').eq('event_id', id).or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
  const alreadyMet = new Set((existingPairings || []).map(p => p.user1_id === userId ? p.user2_id : p.user1_id));
  const needToMeet = [...oppositeIds].filter(id => !alreadyMet.has(id));

  const { data: pendingRounds } = await admin.from('speed_rounds').select('*').eq('event_id', id).eq('status', 'pending').order('round_number');
  const { data: allIcebreakers } = await admin.from('speed_icebreakers').select('id');
  const icebreakers = (allIcebreakers || []).sort(() => Math.random() - 0.5);
  let iceIdx = 0;
  const getIce = () => icebreakers.length > 0 ? icebreakers[iceIdx++ % icebreakers.length].id : null;

  const paired = new Set<string>();
  let roundsAdded = 0;

  for (const round of (pendingRounds || [])) {
    const { data: rp } = await admin.from('speed_pairings').select('user1_id, user2_id').eq('round_id', round.id);
    const pairedInRound = new Set((rp || []).flatMap(p => [p.user1_id, p.user2_id]));
    const available = needToMeet.filter(id => !paired.has(id) && !pairedInRound.has(id));
    if (available.length > 0) {
      await admin.from('speed_pairings').insert({
        round_id: round.id, event_id: id, user1_id: available[0], user2_id: userId,
        table_number: (rp || []).length + 1, icebreaker_id: getIce()
      });
      paired.add(available[0]);
      roundsAdded++;
    }
  }

  // Create new rounds for unmet people
  const unmet = needToMeet.filter(id => !paired.has(id));
  if (unmet.length > 0) {
    const { data: maxR } = await admin.from('speed_rounds').select('round_number').eq('event_id', id).order('round_number', { ascending: false }).limit(1);
    let maxRoundNum = maxR?.[0]?.round_number || 0;
    for (const partnerId of unmet) {
      maxRoundNum++;
      const { data: round } = await admin.from('speed_rounds').insert({ event_id: id, round_number: maxRoundNum, status: 'pending' }).select('id').single();
      await admin.from('speed_pairings').insert({
        round_id: round!.id, event_id: id, user1_id: partnerId, user2_id: userId,
        table_number: 1, icebreaker_id: getIce()
      });
      roundsAdded++;
    }
  }

  return NextResponse.json({ success: true, roundsAdded, extraRoundsCreated: unmet.length });
}
