import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';
import { v4 as uuid } from 'uuid';

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
  const { data: history } = await supabase.from('credits_transactions').select('*').order('created_at', { ascending: false }).limit(100);

  const result: any[] = [];
  for (const h of history || []) {
    const { data: user } = await supabase.from('users').select('first_name, phone_number').eq('id', h.user_id).single();
    result.push({ ...h, first_name: user?.first_name || 'Unknown', phone_number: user?.phone_number });
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const { userId, amountCents, reason } = await req.json();

  if (!userId || !amountCents) {
    return NextResponse.json({ error: 'userId and amountCents required' }, { status: 400 });
  }

  const { data: user } = await supabase.from('users').select('id, credits_balance').eq('id', userId).single();
  if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  await supabase.from('credits_transactions').insert({
    id: uuid(), user_id: userId, amount_cents: amountCents, reason: reason || 'Admin issued',
  });
  await supabase.from('users').update({ credits_balance: (user.credits_balance || 0) + amountCents }).eq('id', userId);

  return NextResponse.json({ success: true, newBalance: (user.credits_balance || 0) + amountCents });
}
