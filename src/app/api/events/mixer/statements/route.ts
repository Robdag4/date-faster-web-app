import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, getUserFromToken, unauthorized, badRequest, notFound } from '@/lib/events-helpers';

async function getUserMixerEvent(admin: any, userId: string) {
  // Active first
  const { data: active } = await admin.from('speed_checkins')
    .select('event_id, speed_events(*)')
    .eq('user_id', userId);
  const found = (active || []).find((c: any) => c.speed_events?.event_type === 'mixer' && ['draft', 'checkin', 'active'].includes(c.speed_events?.status));
  if (found) return { event_id: found.event_id, ...found.speed_events };
  const completed = (active || []).find((c: any) => c.speed_events?.event_type === 'mixer' && c.speed_events?.status === 'completed');
  if (completed) return { event_id: completed.event_id, ...completed.speed_events };
  return null;
}

export async function GET(req: NextRequest) {
  const user = await getUserFromToken(req);
  if (!user) return unauthorized();
  const admin = getAdmin();
  const event = await getUserMixerEvent(admin, user.id);
  if (!event) return NextResponse.json({ statements: null });

  const { data: stmt } = await admin.from('mixer_statements')
    .select('statement1, statement2, statement3, lie_index')
    .eq('event_id', event.id).eq('user_id', user.id).maybeSingle();

  return NextResponse.json({ statements: stmt || null, eventId: event.id, eventStatus: event.status });
}

export async function POST(req: NextRequest) {
  const user = await getUserFromToken(req);
  if (!user) return unauthorized();
  const { statement1, statement2, statement3, lieIndex } = await req.json();
  if (!statement1 || !statement2 || !statement3 || !lieIndex) return badRequest('statement1, statement2, statement3, and lieIndex required');
  if (lieIndex < 1 || lieIndex > 3) return badRequest('lieIndex must be 1, 2, or 3');

  const admin = getAdmin();
  const event = await getUserMixerEvent(admin, user.id);
  if (!event) return notFound('Not checked into a mixer event');

  const { data: existing } = await admin.from('mixer_statements').select('id').eq('event_id', event.id).eq('user_id', user.id).maybeSingle();
  if (existing) {
    await admin.from('mixer_statements').update({ statement1, statement2, statement3, lie_index: lieIndex }).eq('id', existing.id);
    return NextResponse.json({ success: true, updated: true });
  }

  await admin.from('mixer_statements').insert({ event_id: event.id, user_id: user.id, statement1, statement2, statement3, lie_index: lieIndex });
  return NextResponse.json({ success: true });
}
