import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, checkAdminAuth, unauthorized, badRequest } from '@/lib/events-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminAuth(req)) return unauthorized();
  const { id } = await params;
  const admin = getAdmin();

  const { data: active } = await admin.from('speed_rounds').select('*').eq('event_id', id).eq('status', 'active').maybeSingle();
  if (!active) return badRequest('No active round to end');

  await admin.from('speed_rounds').update({ status: 'voting', ended_at: new Date().toISOString() }).eq('id', active.id);
  return NextResponse.json({ success: true, round: active.round_number });
}
