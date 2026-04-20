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
  if (!event) return NextResponse.json({ matches: [], completed: false });
  if (event.status !== 'completed') return NextResponse.json({ matches: [], completed: false });

  const { count: fooledCount } = await admin.from('mixer_guesses').select('*', { count: 'exact', head: true }).eq('event_id', event.id).eq('target_id', user.id).eq('is_correct', false);
  const { count: correctGuesses } = await admin.from('mixer_guesses').select('*', { count: 'exact', head: true }).eq('event_id', event.id).eq('guesser_id', user.id).eq('is_correct', true);
  const { count: totalGuesses } = await admin.from('mixer_guesses').select('*', { count: 'exact', head: true }).eq('event_id', event.id).eq('guesser_id', user.id);

  // Best liar
  const { data: bestLiarData } = await admin.rpc('get_best_liar', { p_event_id: event.id }).maybeSingle();
  // Fallback: manual query
  let bestLiar = null;
  let bestDetective = null;

  // Get all guesses for leaderboards
  const { data: allGuesses } = await admin.from('mixer_guesses').select('guesser_id, target_id, is_correct').eq('event_id', event.id);
  if (allGuesses && allGuesses.length > 0) {
    // Best liar: most people they fooled
    const fooledMap = new Map<string, number>();
    const correctMap = new Map<string, number>();
    for (const g of allGuesses) {
      if (!g.is_correct) fooledMap.set(g.target_id, (fooledMap.get(g.target_id) || 0) + 1);
      if (g.is_correct) correctMap.set(g.guesser_id, (correctMap.get(g.guesser_id) || 0) + 1);
    }
    const topLiar = [...fooledMap.entries()].sort((a, b) => b[1] - a[1])[0];
    const topDetective = [...correctMap.entries()].sort((a, b) => b[1] - a[1])[0];

    if (topLiar) {
      const { data: u } = await admin.from('users').select('first_name').eq('id', topLiar[0]).single();
      bestLiar = { name: u?.first_name, count: topLiar[1] };
    }
    if (topDetective) {
      const { data: u } = await admin.from('users').select('first_name').eq('id', topDetective[0]).single();
      bestDetective = { name: u?.first_name, count: topDetective[1] };
    }
  }

  return NextResponse.json({
    completed: true,
    stats: { fooledCount: fooledCount || 0, correctGuesses: correctGuesses || 0, totalGuesses: totalGuesses || 0 },
    leaderboard: { bestLiar, bestDetective },
  });
}
