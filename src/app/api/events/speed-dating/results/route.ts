import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, getUserFromToken, unauthorized } from '@/lib/events-helpers';

export async function GET(req: NextRequest) {
  const user = await getUserFromToken(req);
  if (!user) return unauthorized();
  const admin = getAdmin();

  // Find completed event
  const { data: checkins } = await admin.from('speed_checkins')
    .select('event_id, speed_events(completed_at, status, date)')
    .eq('user_id', user.id);

  const completedCheckin = (checkins || [])
    .filter((c: any) => c.speed_events?.status === 'completed')
    .sort((a: any, b: any) => (b.speed_events?.date || '').localeCompare(a.speed_events?.date || ''))[0];

  if (!completedCheckin) return NextResponse.json({ matches: [], completed: false });

  const ev = (completedCheckin as any).speed_events;
  if (ev.completed_at) {
    const completedMs = new Date(ev.completed_at).getTime();
    const unlockMs = completedMs + 3600000;
    if (Date.now() < unlockMs) {
      return NextResponse.json({
        matches: [], completed: true, locked: true,
        resultsAvailableAt: new Date(unlockMs).toISOString(),
        remainingMinutes: Math.ceil((unlockMs - Date.now()) / 60000)
      });
    }
  }

  const eventId = completedCheckin.event_id;
  const { data: rounds } = await admin.from('speed_rounds').select('id').eq('event_id', eventId);
  const roundIds = (rounds || []).map(r => r.id);

  if (roundIds.length === 0) return NextResponse.json({ matches: [], completed: true });

  const { data: votes } = await admin.from('speed_votes').select('*').in('round_id', roundIds).eq('wants_match', true);
  const wantsMap = new Map<string, Set<string>>();
  for (const v of (votes || [])) {
    if (!wantsMap.has(v.voter_id)) wantsMap.set(v.voter_id, new Set());
    wantsMap.get(v.voter_id)!.add(v.target_id);
  }

  const myMatches: string[] = [];
  const processed = new Set<string>();
  for (const [voter, targets] of wantsMap) {
    for (const target of targets) {
      const key = [voter, target].sort().join(':');
      if (processed.has(key)) continue;
      if (wantsMap.get(target)?.has(voter)) {
        processed.add(key);
        if (voter === user.id || target === user.id) {
          myMatches.push(voter === user.id ? target : voter);
        }
      }
    }
  }

  const matches = await Promise.all(myMatches.map(async otherId => {
    const { data: other } = await admin.from('users').select('id, first_name, age, photos').eq('id', otherId).single();
    const [u1, u2] = [user.id, otherId].sort();
    const { data: matchRow } = await admin.from('matches').select('id').eq('user1_id', u1).eq('user2_id', u2).maybeSingle();
    return {
      userId: otherId, firstName: other?.first_name || 'Unknown', age: other?.age,
      photos: other?.photos || [], matchId: matchRow?.id || null,
    };
  }));

  return NextResponse.json({ matches, completed: true });
}
