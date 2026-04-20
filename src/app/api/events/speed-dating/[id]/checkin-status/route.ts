import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, checkAdminAuth, unauthorized } from '@/lib/events-helpers';

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminAuth(req)) return unauthorized();
  const { id } = await params;
  const admin = getAdmin();
  await admin.from('speed_events').update({ status: 'checkin' }).eq('id', id).eq('status', 'draft');
  return NextResponse.json({ success: true });
}
