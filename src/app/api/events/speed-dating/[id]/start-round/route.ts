import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, checkAdminAuth, unauthorized, notFound, badRequest } from '@/lib/events-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminAuth(req)) return unauthorized();
  const { id } = await params;
  const admin = getAdmin();

  const { data: event } = await admin.from('speed_events').select('*').eq('id', id).single();
  if (!event) return notFound('Event not found');

  const { data: active } = await admin.from('speed_rounds').select('*').eq('event_id', id).eq('status', 'active').maybeSingle();
  if (active) return badRequest('End the current round first');

  const { data: next } = await admin.from('speed_rounds').select('*').eq('event_id', id).eq('status', 'pending').order('round_number').limit(1).maybeSingle();
  if (!next) return badRequest('No more rounds to start');

  await admin.from('speed_rounds').update({ status: 'active', started_at: new Date().toISOString() }).eq('id', next.id);
  await admin.from('speed_events').update({ status: 'active' }).eq('id', id);
  return NextResponse.json({ success: true, round: next.round_number });
}
