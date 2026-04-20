import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, getUserFromToken, unauthorized, badRequest, notFound } from '@/lib/events-helpers';

export async function POST(req: NextRequest) {
  const authUser = await getUserFromToken(req);
  if (!authUser) return unauthorized();
  const { eventCode } = await req.json();
  if (!eventCode) return badRequest('eventCode required');

  const admin = getAdmin();
  const { data: event } = await admin.from('speed_events').select('*')
    .eq('event_code', eventCode).eq('event_type', 'mixer').in('status', ['draft', 'checkin', 'active']).maybeSingle();
  if (!event) return notFound('Mixer event not found or check-in closed');

  const { data: user } = await admin.from('users').select('id, first_name, age, gender').eq('id', authUser.id).single();
  if (!user) return notFound('User not found');
  if (!user.first_name || !user.age || !user.gender) {
    return NextResponse.json({ error: 'Profile incomplete — need name, age, and gender', needsProfile: true }, { status: 400 });
  }

  const { data: existing } = await admin.from('speed_checkins').select('id').eq('event_id', event.id).eq('user_id', authUser.id).maybeSingle();
  if (existing) return NextResponse.json({ error: 'Already checked in', eventId: event.id }, { status: 409 });

  const { count } = await admin.from('speed_checkins').select('*', { count: 'exact', head: true }).eq('event_id', event.id);
  if ((count || 0) >= event.max_capacity) return badRequest('Event is at capacity');

  await admin.from('speed_checkins').insert({
    event_id: event.id, user_id: authUser.id, gender: user.gender, seat_number: (count || 0) + 1
  });

  return NextResponse.json({ success: true, eventId: event.id });
}
