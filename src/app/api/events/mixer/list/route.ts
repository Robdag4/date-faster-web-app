import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, checkAdminAuth, unauthorized } from '@/lib/events-helpers';

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) return unauthorized();
  const admin = getAdmin();
  const { data } = await admin.from('speed_events').select('*').eq('event_type', 'mixer').order('date', { ascending: false });
  return NextResponse.json(data || []);
}
