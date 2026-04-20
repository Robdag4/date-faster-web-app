import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, badRequest, notFound } from '@/lib/events-helpers';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  if (!code) return badRequest('code query param required');
  const admin = getAdmin();
  const { data: event } = await admin.from('speed_events').select('id, event_type, status').eq('event_code', code).maybeSingle();
  if (!event) return notFound('Event not found');
  return NextResponse.json({ eventType: event.event_type || 'speed_dating', eventId: event.id, status: event.status });
}
