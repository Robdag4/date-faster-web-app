import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, getUserFromToken, unauthorized, badRequest, notFound } from '@/lib/events-helpers';

export async function POST(req: NextRequest) {
  const authUser = await getUserFromToken(req);
  if (!authUser) return unauthorized();
  const { eventCode } = await req.json();
  if (!eventCode) return badRequest('eventCode required');

  const admin = getAdmin();
  const { data: event } = await admin.from('speed_events').select('*')
    .eq('event_code', eventCode).in('status', ['draft', 'checkin', 'active']).maybeSingle();
  if (!event) return notFound('Event not found or check-in closed');

  const { data: user } = await admin.from('users').select('id, first_name, age, gender').eq('id', authUser.id).single();
  if (!user) return notFound('User not found');
  if (!user.first_name || !user.age || !user.gender) {
    return NextResponse.json({ error: 'Profile incomplete — need name, age, and gender', needsProfile: true }, { status: 400 });
  }

  const { data: existing } = await admin.from('speed_checkins').select('id').eq('event_id', event.id).eq('user_id', authUser.id).maybeSingle();
  if (existing) return NextResponse.json({ error: 'Already checked in', eventId: event.id }, { status: 409 });

  const { count } = await admin.from('speed_checkins').select('*', { count: 'exact', head: true }).eq('event_id', event.id);
  if ((count || 0) >= event.max_capacity) return badRequest('Event is at capacity');

  const seatNum = (count || 0) + 1;
  const isLate = event.status === 'active';
  await admin.from('speed_checkins').insert({
    event_id: event.id, user_id: authUser.id, gender: user.gender, seat_number: seatNum, is_late_arrival: isLate
  });

  // Late arrival pairing logic for speed dating events
  if (isLate && (!event.event_type || event.event_type === 'speed_dating')) {
    const oppositeGender = user.gender === 'male' ? 'female' : 'male';
    const { data: opposites } = await admin.from('speed_checkins').select('user_id').eq('event_id', event.id).eq('gender', oppositeGender);
    const { data: allIcebreakers } = await admin.from('speed_icebreakers').select('id');
    const icebreakers = (allIcebreakers || []).sort(() => Math.random() - 0.5);
    let iceIdx = 0;
    const needToMeet = new Set((opposites || []).map(o => o.user_id));

    // Slot into pending rounds
    const { data: pendingRounds } = await admin.from('speed_rounds').select('*').eq('event_id', event.id).eq('status', 'pending').order('round_number');
    for (const round of (pendingRounds || [])) {
      const { data: rp } = await admin.from('speed_pairings').select('user1_id, user2_id').eq('round_id', round.id);
      const pairedUsers = new Set((rp || []).flatMap(p => [p.user1_id, p.user2_id]));
      const available = [...needToMeet].filter(id => !pairedUsers.has(id));
      if (available.length > 0) {
        const iceId = icebreakers.length > 0 ? icebreakers[iceIdx++ % icebreakers.length].id : null;
        await admin.from('speed_pairings').insert({
          round_id: round.id, event_id: event.id, user1_id: available[0], user2_id: authUser.id,
          table_number: (rp || []).length + 1, icebreaker_id: iceId
        });
        needToMeet.delete(available[0]);
      }
    }

    // Create extra rounds for unmet
    if (needToMeet.size > 0) {
      const { data: maxR } = await admin.from('speed_rounds').select('round_number').eq('event_id', event.id).order('round_number', { ascending: false }).limit(1);
      let roundNum = maxR?.[0]?.round_number || 0;
      for (const partnerId of needToMeet) {
        roundNum++;
        const { data: round } = await admin.from('speed_rounds').insert({ event_id: event.id, round_number: roundNum, status: 'pending' }).select('id').single();
        const iceId = icebreakers.length > 0 ? icebreakers[iceIdx++ % icebreakers.length].id : null;
        await admin.from('speed_pairings').insert({
          round_id: round!.id, event_id: event.id, user1_id: partnerId, user2_id: authUser.id,
          table_number: 1, icebreaker_id: iceId
        });
      }
    }
  }

  return NextResponse.json({ success: true, eventId: event.id, seatNumber: seatNum, lateArrival: isLate, eventType: event.event_type || 'speed_dating' });
}
