import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, checkAdminAuth, unauthorized } from '@/lib/events-helpers';

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return unauthorized();
  const admin = getAdmin();
  const { data, error } = await admin.from('speed_events')
    .select('*, speed_checkins(count)')
    .or('event_type.is.null,event_type.eq.speed_dating')
    .order('date', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  const events = (data || []).map((e: any) => ({ ...e, checkin_count: e.speed_checkins?.[0]?.count || 0 }));
  return NextResponse.json(events);
}
