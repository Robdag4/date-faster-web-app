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
  const search = req.nextUrl.searchParams.get('search') || '';
  const id = req.nextUrl.searchParams.get('id');

  if (id) {
    // Single user detail
    const { data: user } = await supabase.from('users').select('*').eq('id', id).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    const { data: payments } = await supabase.from('payments').select('id, amount_cents, status, created_at, date_request_id').eq('payer_id', id).eq('status', 'completed').order('created_at', { ascending: false });
    const totalSpent = (payments || []).reduce((s: number, p: any) => s + (p.amount_cents || 0), 0);

    const { count: matchCount } = await supabase.from('matches').select('*', { count: 'exact', head: true }).or(`user1_id.eq.${id},user2_id.eq.${id}`).neq('status', 'unmatched');

    // Get date history with package info
    const dateHistory: any[] = [];
    for (const p of (payments || []).slice(0, 10)) {
      if (p.date_request_id) {
        const { data: dr } = await supabase.from('date_requests').select('package_id, status, note').eq('id', p.date_request_id).single();
        if (dr) {
          const { data: pkg } = await supabase.from('date_packages').select('name, category').eq('id', dr.package_id).single();
          dateHistory.push({ payment_id: p.id, amount_cents: p.amount_cents, payment_date: p.created_at, package_name: pkg?.name || 'Unknown', package_category: pkg?.category });
        }
      }
    }

    // Get chats
    const { data: matches } = await supabase.from('matches').select('id, status, created_at, user1_id, user2_id').or(`user1_id.eq.${id},user2_id.eq.${id}`).order('created_at', { ascending: false });
    const chats: any[] = [];
    for (const m of (matches || []).slice(0, 20)) {
      const { count } = await supabase.from('messages').select('*', { count: 'exact', head: true }).eq('match_id', m.id);
      const otherId = m.user1_id === id ? m.user2_id : m.user1_id;
      const { data: other } = await supabase.from('users').select('first_name').eq('id', otherId).single();
      const { data: me } = await supabase.from('users').select('first_name').eq('id', id).single();
      chats.push({
        match_id: m.id, status: m.status, message_count: count || 0,
        user1_id: m.user1_id, user2_id: m.user2_id,
        user1_name: m.user1_id === id ? me?.first_name : other?.first_name,
        user2_name: m.user2_id === id ? me?.first_name : other?.first_name,
      });
    }

    return NextResponse.json({
      user,
      analytics: { datesPurchased: (payments || []).length, totalSpent, dateHistory, matchCount: matchCount || 0 },
      chats,
    });
  }

  // List users (include deleted for admin filtering)
  let query = supabase.from('users').select('id, phone_number, first_name, age, gender, preference, bio, job_title, tagline, photos, onboarding_complete, locked_at, is_premium, credits_balance, created_at, deleted_at, photo_flagged').order('created_at', { ascending: false });
  if (search) {
    query = query.or(`first_name.ilike.%${search}%,phone_number.ilike.%${search}%`);
  }
  const { data: users } = await query.limit(500);
  return NextResponse.json(users || []);
}

export async function PATCH(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const body = await req.json();
  const { id, action } = body;

  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  if (action === 'lock') {
    await supabase.from('users').update({ locked_at: new Date().toISOString() }).eq('id', id);
  } else if (action === 'unlock') {
    await supabase.from('users').update({ locked_at: null }).eq('id', id);
  } else if (action === 'restore') {
    await supabase.from('users').update({ deleted_at: null }).eq('id', id);
  }

  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await supabase.from('users').update({ deleted_at: new Date().toISOString() }).eq('id', id);
  return NextResponse.json({ success: true });
}
