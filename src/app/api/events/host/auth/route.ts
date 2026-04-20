import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, badRequest } from '@/lib/events-helpers';

export async function POST(req: NextRequest) {
  const { hostUsername, eventCode } = await req.json();
  if (!hostUsername || !eventCode) return badRequest('Username and event code required');
  const admin = getAdmin();

  const { data: event } = await admin.from('speed_events')
    .select('id, name, event_code, city, venue_name, date, status, max_capacity, round_duration_seconds, event_type, host_username')
    .eq('host_username', hostUsername).eq('event_code', eventCode).single();

  if (!event) return NextResponse.json({ error: 'Invalid credentials' }, { status: 401 });
  const { host_username, ...safeEvent } = event;
  return NextResponse.json({ success: true, event: safeEvent });
}
