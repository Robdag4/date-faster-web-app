import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, getUserFromToken, unauthorized, badRequest, notFound } from '@/lib/events-helpers';

async function getUserMixerEvent(admin: any, userId: string) {
  const { data } = await admin.from('speed_checkins').select('event_id, speed_events(*)').eq('user_id', userId);
  const found = (data || []).find((c: any) => c.speed_events?.event_type === 'mixer' && ['draft', 'checkin', 'active'].includes(c.speed_events?.status));
  if (found) return { event_id: found.event_id, ...found.speed_events };
  const completed = (data || []).find((c: any) => c.speed_events?.event_type === 'mixer' && c.speed_events?.status === 'completed');
  if (completed) return { event_id: completed.event_id, ...completed.speed_events };
  return null;
}

export async function POST(req: NextRequest) {
  const user = await getUserFromToken(req);
  if (!user) return unauthorized();
  const { targetId } = await req.json();
  if (!targetId) return badRequest('targetId required');
  const admin = getAdmin();
  const event = await getUserMixerEvent(admin, user.id);
  if (!event) return notFound('Not checked into a mixer event');

  const { data: existing } = await admin.from('mixer_stars').select('id').eq('event_id', event.id).eq('starrer_id', user.id).eq('starred_id', targetId).maybeSingle();
  if (existing) return NextResponse.json({ success: true, already: true });

  await admin.from('mixer_stars').insert({ event_id: event.id, starrer_id: user.id, starred_id: targetId });

  // Check mutual
  const { data: mutual } = await admin.from('mixer_stars').select('id').eq('event_id', event.id).eq('starrer_id', targetId).eq('starred_id', user.id).maybeSingle();
  let matchId = null;
  if (mutual) {
    const [u1, u2] = [user.id, targetId].sort();
    const { data: existingMatch } = await admin.from('matches').select('id').eq('user1_id', u1).eq('user2_id', u2).maybeSingle();
    if (!existingMatch) {
      const { data: m } = await admin.from('matches').insert({ user1_id: u1, user2_id: u2, status: 'matched', source: 'mixer' }).select('id').single();
      matchId = m?.id;
    } else {
      matchId = existingMatch.id;
    }
  }

  return NextResponse.json({ success: true, mutual: !!mutual, matchId });
}

export async function DELETE(req: NextRequest) {
  const user = await getUserFromToken(req);
  if (!user) return unauthorized();
  const { targetId } = await req.json();
  if (!targetId) return badRequest('targetId required');
  const admin = getAdmin();
  const event = await getUserMixerEvent(admin, user.id);
  if (!event) return notFound('Not checked into a mixer event');

  await admin.from('mixer_stars').delete().eq('event_id', event.id).eq('starrer_id', user.id).eq('starred_id', targetId);
  return NextResponse.json({ success: true });
}
