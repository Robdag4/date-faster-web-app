import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, getUserFromToken, unauthorized, notFound } from '@/lib/events-helpers';

async function getUserMixerEvent(admin: any, userId: string) {
  const { data } = await admin.from('speed_checkins').select('event_id, speed_events(*)').eq('user_id', userId);
  const found = (data || []).find((c: any) => c.speed_events?.event_type === 'mixer' && ['draft', 'checkin', 'active'].includes(c.speed_events?.status));
  if (found) return { event_id: found.event_id, ...found.speed_events };
  const completed = (data || []).find((c: any) => c.speed_events?.event_type === 'mixer' && c.speed_events?.status === 'completed');
  if (completed) return { event_id: completed.event_id, ...completed.speed_events };
  return null;
}

export async function GET(req: NextRequest) {
  const user = await getUserFromToken(req);
  if (!user) return unauthorized();
  const admin = getAdmin();
  const event = await getUserMixerEvent(admin, user.id);
  if (!event) return notFound('Not checked into a mixer event');

  // Auto-complete after 4 hours
  if (event.status === 'active' && event.started_at) {
    const startedMs = new Date(event.started_at).getTime();
    if (Date.now() >= startedMs + 4 * 3600000) {
      await admin.from('speed_events').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', event.id);
      event.status = 'completed';
    }
  }

  const { count: fooledCount } = await admin.from('mixer_guesses').select('*', { count: 'exact', head: true }).eq('event_id', event.id).eq('target_id', user.id).eq('is_correct', false);
  const { count: correctGuesses } = await admin.from('mixer_guesses').select('*', { count: 'exact', head: true }).eq('event_id', event.id).eq('guesser_id', user.id).eq('is_correct', true);
  const { count: totalGuesses } = await admin.from('mixer_guesses').select('*', { count: 'exact', head: true }).eq('event_id', event.id).eq('guesser_id', user.id);
  const { count: starsGiven } = await admin.from('mixer_stars').select('*', { count: 'exact', head: true }).eq('event_id', event.id).eq('starrer_id', user.id);

  return NextResponse.json({ fooledCount: fooledCount || 0, correctGuesses: correctGuesses || 0, totalGuesses: totalGuesses || 0, starsGiven: starsGiven || 0, eventStatus: event.status });
}
