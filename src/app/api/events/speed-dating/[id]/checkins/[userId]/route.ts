import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, checkAdminAuth, unauthorized, notFound } from '@/lib/events-helpers';

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string; userId: string }> }) {
  if (!checkAdminAuth(req)) return unauthorized();
  const { id, userId } = await params;
  const admin = getAdmin();

  // Remove pairings involving this user
  await admin.from('speed_pairings').delete().eq('event_id', id).or(`user1_id.eq.${userId},user2_id.eq.${userId}`);
  // Remove votes
  const { data: rounds } = await admin.from('speed_rounds').select('id').eq('event_id', id);
  const roundIds = (rounds || []).map(r => r.id);
  if (roundIds.length > 0) {
    await admin.from('speed_votes').delete().in('round_id', roundIds).or(`voter_id.eq.${userId},target_id.eq.${userId}`);
  }
  // Remove checkin
  const { data } = await admin.from('speed_checkins').delete().eq('event_id', id).eq('user_id', userId).select('id');
  if (!data || data.length === 0) return notFound('Checkin not found');
  return NextResponse.json({ success: true });
}
