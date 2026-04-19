import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

function checkAuth(req: NextRequest) {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ') || header.slice(7) !== ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const { data: dateRequests } = await supabase.from('date_requests').select('*').not('redemption_code', 'is', null).order('redeemed_at', { ascending: false, nullsFirst: false });

  const result: any[] = [];
  for (const dr of dateRequests || []) {
    const { data: pkg } = await supabase.from('date_packages').select('name, price_cents, venue_id').eq('id', dr.package_id).single();
    let venue_name = null;
    if (pkg?.venue_id) {
      const { data: v } = await supabase.from('venues').select('name').eq('id', pkg.venue_id).single();
      venue_name = v?.name;
    }
    const { data: sender } = await supabase.from('users').select('first_name').eq('id', dr.sender_id).single();
    const { data: receiver } = await supabase.from('users').select('first_name').eq('id', dr.receiver_id).single();

    // Find payment
    const { data: payment } = await supabase.from('payments').select('id, payout_status').eq('date_request_id', dr.id).eq('status', 'completed').single();

    result.push({
      id: dr.id, redemption_code: dr.redemption_code, redeemed_at: dr.redeemed_at, redeemed_by: dr.redeemed_by,
      scheduled_date: dr.scheduled_date, scheduled_time: dr.scheduled_time,
      package_name: pkg?.name || 'Unknown', price_cents: pkg?.price_cents || 0, venue_name,
      sender_name: sender?.first_name || 'Unknown', receiver_name: receiver?.first_name || 'Unknown',
      payment_id: payment?.id, payout_status: payment?.payout_status || 'pending',
    });
  }

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const { paymentId, status } = await req.json();
  if (!['pending', 'paid'].includes(status)) return NextResponse.json({ error: 'Invalid status' }, { status: 400 });

  await supabase.from('payments').update({ payout_status: status }).eq('id', paymentId);
  return NextResponse.json({ success: true });
}
