import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, notFound, unauthorized } from '@/lib/events-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ eventCode: string }> }) {
  const { eventCode } = await params;
  const username = req.nextUrl.searchParams.get('u');
  const admin = getAdmin();

  const { data: event } = await admin.from('speed_events').select('*').eq('event_code', eventCode).single();
  if (!event) return notFound('Event not found');
  if (!event.host_username || event.host_username !== username) return unauthorized();

  const { data: checkins } = await admin.from('speed_checkins')
    .select('*, users(first_name, age, gender)')
    .eq('event_id', event.id).order('seat_number');

  const { data: rounds } = await admin.from('speed_rounds').select('*').eq('event_id', event.id).order('round_number');

  const { data: pairings } = await admin.from('speed_pairings')
    .select('*, user1:users!speed_pairings_user1_id_fkey(first_name), user2:users!speed_pairings_user2_id_fkey(first_name), speed_rounds(round_number), speed_icebreakers(question)')
    .eq('event_id', event.id).order('table_number');

  const roundsList = rounds || [];
  const activeRound = roundsList.find((r: any) => r.status === 'active') || null;
  const votingRound = roundsList.find((r: any) => r.status === 'voting') || null;

  // Vote counts per round
  const voteCounts: Record<string, { voted: number; total: number }> = {};
  for (const round of roundsList) {
    const rPairings = (pairings || []).filter((p: any) => p.round_id === round.id);
    const totalVoters = rPairings.length * 2;
    const { count } = await admin.from('speed_votes').select('*', { count: 'exact', head: true }).eq('round_id', round.id);
    voteCounts[round.id] = { voted: count || 0, total: totalVoters };
  }

  // Mixer stats
  let statementStats = null;
  let mixerEndsAt = null;
  const checkinsList = (checkins || []).map((c: any) => ({
    ...c, first_name: c.users?.first_name, age: c.users?.age, gender: c.users?.gender || c.gender,
  }));

  if (event.event_type === 'mixer') {
    const { count: submitted } = await admin.from('mixer_statements').select('*', { count: 'exact', head: true }).eq('event_id', event.id);
    statementStats = { submitted: submitted || 0, total: checkinsList.length };

    const { data: stmtUsers } = await admin.from('mixer_statements').select('user_id').eq('event_id', event.id);
    const stmtSet = new Set((stmtUsers || []).map(r => r.user_id));
    checkinsList.forEach((c: any) => { c.hasStatements = stmtSet.has(c.user_id); });

    if (event.started_at && event.status === 'active') {
      const startedMs = new Date(event.started_at).getTime();
      const endsMs = startedMs + 4 * 3600000;
      mixerEndsAt = new Date(endsMs).toISOString();
      if (Date.now() >= endsMs) {
        await admin.from('speed_events').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', event.id);
        event.status = 'completed';
      }
    }
  }

  return NextResponse.json({
    event,
    checkins: checkinsList,
    rounds: roundsList,
    pairings: (pairings || []).map((p: any) => ({
      ...p, user1_name: p.user1?.first_name, user2_name: p.user2?.first_name,
      round_number: p.speed_rounds?.round_number, icebreaker: p.speed_icebreakers?.question,
    })),
    activeRound, votingRound,
    completedRounds: roundsList.filter((r: any) => r.status === 'completed').length,
    pendingRounds: roundsList.filter((r: any) => r.status === 'pending').length,
    totalRounds: roundsList.length,
    voteCounts, statementStats, mixerEndsAt,
  });
}
