import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, checkAdminAuth, unauthorized, badRequest, generateHostUsername, generateEventCode } from '@/lib/events-helpers';

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) return unauthorized();
  const { name, city, venue_name, venue_address, date, max_capacity, round_duration_seconds } = await req.json();
  if (!name || !city || !date) return badRequest('name, city, and date are required');

  const admin = getAdmin();
  const event_code = await generateEventCode(admin);
  const host_username = generateHostUsername();

  const { data, error } = await admin.from('speed_events').insert({
    name, event_code, city, venue_name: venue_name || null, venue_address: venue_address || null,
    date, status: 'draft', event_type: 'speed_dating', max_capacity: max_capacity || 50,
    round_duration_seconds: round_duration_seconds || 300, host_username
  }).select('id').single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ id: data.id, event_code, host_username }, { status: 201 });
}
