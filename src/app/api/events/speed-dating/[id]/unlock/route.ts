import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, checkAdminAuth, unauthorized, notFound } from '@/lib/events-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminAuth(req)) return unauthorized();
  const { id } = await params;
  const admin = getAdmin();

  const { data: event } = await admin.from('speed_events').select('*').eq('id', id).single();
  if (!event) return notFound('Event not found');

  // Set completed_at to 2 hours ago so 1-hour lock is bypassed
  await admin.from('speed_events').update({ completed_at: new Date(Date.now() - 7200000).toISOString() }).eq('id', id);
  return NextResponse.json({ success: true, message: 'Results unlocked' });
}
