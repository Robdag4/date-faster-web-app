import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, checkAdminAuth, unauthorized, notFound } from '@/lib/events-helpers';

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!checkAdminAuth(req)) return unauthorized();
  const { id } = await params;
  const admin = getAdmin();

  const { data: event } = await admin.from('speed_events').select('*').eq('id', id).single();
  if (!event) return notFound('Event not found');

  const { data: checkins } = await admin.from('speed_checkins')
    .select('*, users(first_name, age, photos)')
    .eq('event_id', id).order('checked_in_at');

  const { data: rounds } = await admin.from('speed_rounds')
    .select('*').eq('event_id', id).order('round_number');

  const { data: pairings } = await admin.from('speed_pairings')
    .select('*, user1:users!speed_pairings_user1_id_fkey(first_name), user2:users!speed_pairings_user2_id_fkey(first_name), icebreaker:speed_icebreakers(question)')
    .eq('event_id', id).order('table_number');

  return NextResponse.json({
    event,
    checkins: (checkins || []).map((c: any) => ({ ...c, first_name: c.users?.first_name, age: c.users?.age, photos: c.users?.photos })),
    rounds,
    pairings: (pairings || []).map((p: any) => ({ ...p, user1_name: p.user1?.first_name, user2_name: p.user2?.first_name, icebreaker: p.icebreaker?.question })),
  });
}
