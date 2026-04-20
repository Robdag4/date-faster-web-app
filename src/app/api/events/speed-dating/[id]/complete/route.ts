import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, checkAdminAuth, unauthorized, notFound } from '@/lib/events-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminAuth(req)) return unauthorized();
  const { id } = await params;
  const admin = getAdmin();

  const { data: event } = await admin.from('speed_events').select('*').eq('id', id).single();
  if (!event) return notFound('Event not found');

  // Mark voting/active rounds as completed
  await admin.from('speed_rounds').update({ status: 'completed' }).eq('event_id', id).in('status', ['voting', 'active']);

  // Find mutual matches via RPC or manual query
  // Get all votes for this event
  const { data: rounds } = await admin.from('speed_rounds').select('id').eq('event_id', id);
  const roundIds = (rounds || []).map(r => r.id);

  let matchesCreated = 0;
  if (roundIds.length > 0) {
    const { data: votes } = await admin.from('speed_votes').select('*').in('round_id', roundIds).eq('wants_match', true);
    
    // Find mutual: both voted wants_match for each other
    const wantsMap = new Map<string, Set<string>>();
    for (const v of (votes || [])) {
      if (!wantsMap.has(v.voter_id)) wantsMap.set(v.voter_id, new Set());
      wantsMap.get(v.voter_id)!.add(v.target_id);
    }

    const processed = new Set<string>();
    for (const [voter, targets] of wantsMap) {
      for (const target of targets) {
        const key = [voter, target].sort().join(':');
        if (processed.has(key)) continue;
        if (wantsMap.get(target)?.has(voter)) {
          processed.add(key);
          const [user1_id, user2_id] = [voter, target].sort();
          const { data: existing } = await admin.from('matches').select('id')
            .eq('user1_id', user1_id).eq('user2_id', user2_id).maybeSingle();
          if (!existing) {
            await admin.from('matches').insert({ user1_id, user2_id, status: 'matched', source: 'speed_dating' });
            matchesCreated++;
          }
        }
      }
    }
  }

  await admin.from('speed_events').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ success: true, matchesCreated, resultsAvailableAt: new Date(Date.now() + 3600000).toISOString() });
}
