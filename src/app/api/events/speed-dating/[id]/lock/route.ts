import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, checkAdminAuth, unauthorized, notFound, badRequest } from '@/lib/events-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminAuth(req)) return unauthorized();
  const { id } = await params;
  const admin = getAdmin();

  const { data: event } = await admin.from('speed_events').select('*').eq('id', id).single();
  if (!event) return notFound('Event not found');
  if (event.status !== 'draft' && event.status !== 'checkin') return badRequest('Can only lock events in draft or checkin status');

  const { data: checkins } = await admin.from('speed_checkins').select('*').eq('event_id', id);
  if (!checkins || checkins.length < 2) return badRequest('Need at least 2 checkins to generate rounds');

  const males = checkins.filter(c => c.gender === 'male');
  const females = checkins.filter(c => c.gender === 'female');
  if (males.length === 0 || females.length === 0) return badRequest('Need at least 1 male and 1 female');

  const minority = males.length <= females.length ? males : females;
  const majority = males.length <= females.length ? females : males;
  const numTables = minority.length;
  const totalRounds = majority.length;

  const { data: allIcebreakers } = await admin.from('speed_icebreakers').select('id');
  const shuffled = (allIcebreakers || []).sort(() => Math.random() - 0.5);
  let iceIdx = 0;

  // Delete existing
  await admin.from('speed_pairings').delete().eq('event_id', id);
  await admin.from('speed_rounds').delete().eq('event_id', id);

  for (let r = 0; r < totalRounds; r++) {
    const { data: round } = await admin.from('speed_rounds').insert({
      event_id: id, round_number: r + 1, status: 'pending'
    }).select('id').single();

    for (let t = 0; t < numTables; t++) {
      const majIdx = (t + r) % majority.length;
      const iceId = shuffled.length > 0 ? shuffled[iceIdx % shuffled.length].id : null;
      iceIdx++;
      await admin.from('speed_pairings').insert({
        round_id: round!.id, event_id: id,
        user1_id: minority[t].user_id, user2_id: majority[majIdx].user_id,
        table_number: t + 1, icebreaker_id: iceId
      });
    }
  }

  await admin.from('speed_events').update({ status: 'active' }).eq('id', id);
  return NextResponse.json({ success: true, totalRounds, tablesPerRound: numTables });
}
