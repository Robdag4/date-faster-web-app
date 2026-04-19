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
  const { data: venues } = await supabase.from('venues').select('*').order('created_at', { ascending: false });
  return NextResponse.json(venues || []);
}

export async function POST(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const { name, address, phone, email, contact_name, payout_method, payout_details, pin } = await req.json();
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 });

  const id = uuid();
  await supabase.from('venues').insert({
    id, name, address: address || null, phone: phone || null, email: email || null,
    contact_name: contact_name || null, payout_method: payout_method || 'manual',
    payout_details: payout_details || null, pin: pin || null, active: true,
  });

  return NextResponse.json({ id, name, success: true });
}

export async function PATCH(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await supabase.from('venues').update(updates).eq('id', id);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const { id } = await req.json();
  await supabase.from('venues').update({ active: false }).eq('id', id);
  return NextResponse.json({ success: true });
}
