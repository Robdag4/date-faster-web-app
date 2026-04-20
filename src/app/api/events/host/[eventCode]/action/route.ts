import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, notFound, unauthorized, badRequest } from '@/lib/events-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ eventCode: string }> }) {
  const { eventCode } = await params;
  const { action, hostUsername } = await req.json();
  const admin = getAdmin();

  const { data: event } = await admin.from('speed_events').select('*').eq('event_code', eventCode).single();
  if (!event) return notFound('Event not found');
  if (!event.host_username || event.host_username !== hostUsername) return unauthorized();

  if (action === 'open-checkin') {
    await admin.from('speed_events').update({ status: 'checkin' }).eq('id', event.id).eq('status', 'draft');
    return NextResponse.json({ success: true });
  }

  if (action === 'lock') {
    const { data: checkins } = await admin.from('speed_checkins').select('*').eq('event_id', event.id);
    if (!checkins || checkins.length < 2) return badRequest('Need at least 2 checkins');
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

    await admin.from('speed_pairings').delete().eq('event_id', event.id);
    await admin.from('speed_rounds').delete().eq('event_id', event.id);

    for (let r = 0; r < totalRounds; r++) {
      const { data: round } = await admin.from('speed_rounds').insert({
        event_id: event.id, round_number: r + 1, status: 'pending'
      }).select('id').single();
      for (let t = 0; t < numTables; t++) {
        const majIdx = (t + r) % majority.length;
        const iceId = shuffled.length > 0 ? shuffled[iceIdx % shuffled.length].id : null;
        iceIdx++;
        await admin.from('speed_pairings').insert({
          round_id: round!.id, event_id: event.id,
          user1_id: minority[t].user_id, user2_id: majority[majIdx].user_id,
          table_number: t + 1, icebreaker_id: iceId
        });
      }
    }
    await admin.from('speed_events').update({ status: 'active' }).eq('id', event.id);
    return NextResponse.json({ success: true, totalRounds, tablesPerRound: numTables });
  }

  if (action === 'start-round') {
    const { data: active } = await admin.from('speed_rounds').select('*').eq('event_id', event.id).eq('status', 'active').maybeSingle();
    if (active) return badRequest('End the current round first');
    const { data: next } = await admin.from('speed_rounds').select('*').eq('event_id', event.id).eq('status', 'pending').order('round_number').limit(1).maybeSingle();
    if (!next) return badRequest('No more rounds');
    await admin.from('speed_rounds').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', next.id);
    return NextResponse.json({ success: true, round: next.round_number });
  }

  if (action === 'end-round') {
    const { data: active } = await admin.from('speed_rounds').select('*').eq('event_id', event.id).eq('status', 'active').maybeSingle();
    if (!active) return badRequest('No active round');
    await admin.from('speed_rounds').update({ status: 'voting', ended_at: new Date().toISOString() }).eq('id', active.id);
    return NextResponse.json({ success: true, round: active.round_number });
  }

  if (action === 'complete') {
    await admin.from('speed_rounds').update({ status: 'completed' }).eq('event_id', event.id).in('status', ['voting', 'active']);
    const { data: rounds } = await admin.from('speed_rounds').select('id').eq('event_id', event.id);
    const roundIds = (rounds || []).map(r => r.id);
    let matchesCreated = 0;
    if (roundIds.length > 0) {
      const { data: votes } = await admin.from('speed_votes').select('*').in('round_id', roundIds).eq('wants_match', true);
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
            const [u1, u2] = [voter, target].sort();
            const { data: existing } = await admin.from('matches').select('id').eq('user1_id', u1).eq('user2_id', u2).maybeSingle();
            if (!existing) {
              await admin.from('matches').insert({ user1_id: u1, user2_id: u2, status: 'matched', source: 'speed_dating' });
              matchesCreated++;
            }
          }
        }
      }
    }
    await admin.from('speed_events').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', event.id);
    return NextResponse.json({ success: true, matchesCreated, resultsAvailableAt: new Date(Date.now() + 3600000).toISOString() });
  }

  if (action === 'start-mixer') {
    if (event.status !== 'checkin' && event.status !== 'draft') return badRequest('Event already started or completed');
    await admin.from('speed_events').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', event.id);
    return NextResponse.json({ success: true, endsAt: new Date(Date.now() + 4 * 3600000).toISOString() });
  }

  if (action === 'complete-mixer') {
    await admin.from('speed_events').update({ status: 'completed', completed_at: new Date().toISOString() }).eq('id', event.id);
    return NextResponse.json({ success: true });
  }

  return badRequest('Unknown action');
}
