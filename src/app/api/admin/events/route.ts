import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { v4 as uuid } from 'uuid';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

function checkAuth(req: NextRequest) {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ') || header.slice(7) !== ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

function generateCode(len = 6) {
  return Math.random().toString(36).substring(2, 2 + len).toUpperCase();
}

export async function GET(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const type = req.nextUrl.searchParams.get('type'); // 'speed' or 'mixer'
  const id = req.nextUrl.searchParams.get('id');

  if (type === 'mixer') {
    if (id) {
      const { data: event } = await supabase.from('mixer_events').select('*').eq('id', id).single();
      if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
      const { data: checkins } = await supabase.from('mixer_checkins').select('*').eq('event_id', id);
      // Attach user info
      const checkinData: any[] = [];
      for (const c of checkins || []) {
        const { data: u } = await supabase.from('users').select('first_name, gender, age').eq('id', c.user_id).single();
        checkinData.push({ ...c, first_name: u?.first_name, gender: u?.gender, age: u?.age });
      }
      return NextResponse.json({ event, checkins: checkinData, stats: { statementCount: 0, guessCount: 0, starCount: 0 } });
    }
    const { data: events } = await supabase.from('mixer_events').select('*').order('created_at', { ascending: false });
    const result: any[] = [];
    for (const ev of events || []) {
      const { count } = await supabase.from('mixer_checkins').select('*', { count: 'exact', head: true }).eq('event_id', ev.id);
      result.push({ ...ev, checkin_count: count || 0 });
    }
    return NextResponse.json(result);
  }

  // Speed dating
  if (id) {
    const { data: event } = await supabase.from('speed_dating_events').select('*').eq('id', id).single();
    if (!event) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    const { data: checkins } = await supabase.from('speed_dating_checkins').select('*').eq('event_id', id).order('seat_number');
    const checkinData: any[] = [];
    for (const c of checkins || []) {
      const { data: u } = await supabase.from('users').select('first_name, gender, age').eq('id', c.user_id).single();
      checkinData.push({ ...c, first_name: u?.first_name, gender: u?.gender, age: u?.age });
    }

    // Rounds & pairings - try to get from speed_dating_rounds if it exists, otherwise empty
    let rounds: any[] = [];
    let pairings: any[] = [];
    let matches: any[] = [];

    try {
      const { data: r } = await supabase.from('speed_dating_rounds' as any).select('*').eq('event_id', id).order('round_number');
      rounds = r || [];
      if (rounds.length > 0) {
        const roundIds = rounds.map((r: any) => r.id);
        const { data: p } = await supabase.from('speed_dating_pairings' as any).select('*').in('round_id', roundIds);
        pairings = p || [];
        // Attach names
        for (const pair of pairings) {
          const { data: u1 } = await supabase.from('users').select('first_name').eq('id', pair.user1_id).single();
          const { data: u2 } = await supabase.from('users').select('first_name').eq('id', pair.user2_id).single();
          pair.user1_name = u1?.first_name;
          pair.user2_name = u2?.first_name;
        }
      }
    } catch {}

    // Matches from votes
    if ((event as any).status === 'completed') {
      try {
        const { data: votes } = await supabase.from('speed_dating_votes').select('*').eq('event_id', id).eq('vote', 'yes');
        const voteMap: Record<string, Set<string>> = {};
        for (const v of votes || []) {
          if (!voteMap[v.voter_id]) voteMap[v.voter_id] = new Set();
          voteMap[v.voter_id].add(v.target_id);
        }
        const seen = new Set<string>();
        for (const [a, targets] of Object.entries(voteMap)) {
          for (const b of targets) {
            if (voteMap[b]?.has(a) && !seen.has(`${b}-${a}`)) {
              seen.add(`${a}-${b}`);
              const { data: u1 } = await supabase.from('users').select('first_name, gender, age').eq('id', a).single();
              const { data: u2 } = await supabase.from('users').select('first_name, gender, age').eq('id', b).single();
              matches.push({
                user1_name: u1?.first_name, user1_gender: u1?.gender, user1_age: u1?.age,
                user2_name: u2?.first_name, user2_gender: u2?.gender, user2_age: u2?.age,
              });
            }
          }
        }
      } catch {}
    }

    return NextResponse.json({ event, checkins: checkinData, rounds, pairings, matches });
  }

  const { data: events } = await supabase.from('speed_dating_events').select('*').order('created_at', { ascending: false });
  const result: any[] = [];
  for (const ev of events || []) {
    const { count } = await supabase.from('speed_dating_checkins').select('*', { count: 'exact', head: true }).eq('event_id', ev.id);
    result.push({ ...ev, checkin_count: count || 0 });
  }
  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const body = await req.json();
  const type = body.type; // 'speed' or 'mixer'

  const id = uuid();
  const event_code = generateCode();
  const host_username = 'host_' + generateCode(4).toLowerCase();

  if (type === 'mixer') {
    await supabase.from('mixer_events').insert({
      id, name: body.name, city: body.city || null, venue_name: body.venue_name || null,
      venue_address: body.venue_address || null, date: body.date, max_capacity: body.max_capacity || 50,
      event_code, host_username, status: 'draft',
    });
  } else {
    await supabase.from('speed_dating_events').insert({
      id, name: body.name, city: body.city || null, venue_name: body.venue_name || null,
      venue_address: body.venue_address || null, date: body.date, max_capacity: body.max_capacity || 50,
      round_duration_seconds: body.round_duration_seconds || 300,
      event_code, host_username, status: 'draft',
    });
  }

  return NextResponse.json({ id, event_code, success: true });
}

export async function PATCH(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const { id, type, action, ...updates } = await req.json();
  const table = type === 'mixer' ? 'mixer_events' : 'speed_dating_events';

  if (action === 'start' || action === 'checkin') {
    await supabase.from(table).update({ status: action === 'start' ? 'active' : 'checkin' }).eq('id', id);
  } else if (action === 'complete') {
    await supabase.from(table).update({ status: 'completed' }).eq('id', id);
  } else if (action === 'lock') {
    await supabase.from(table).update({ status: 'active' }).eq('id', id);
  } else {
    await supabase.from(table).update(updates).eq('id', id);
  }

  return NextResponse.json({ success: true });
}
