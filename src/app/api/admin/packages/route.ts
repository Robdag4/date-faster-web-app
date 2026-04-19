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
  const { data: packages } = await supabase.from('date_packages').select('*').order('category').order('price_cents');

  // Attach venue names
  const result: any[] = [];
  for (const p of packages || []) {
    let venue_name = null;
    if (p.venue_id) {
      const { data: v } = await supabase.from('venues').select('name').eq('id', p.venue_id).single();
      venue_name = v?.name;
    }
    result.push({ ...p, venue_name });
  }

  return NextResponse.json(result);
}

export async function POST(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const { name, description, price_cents, category, venue_id, image_url } = await req.json();

  if (!name || !price_cents || !category) {
    return NextResponse.json({ error: 'name, price_cents, and category required' }, { status: 400 });
  }

  const id = uuid();
  await supabase.from('date_packages').insert({
    id, name, description: description || '', price_cents, category,
    venue_id: venue_id || null, image_url: image_url || '', active: true,
  });

  return NextResponse.json({ id, success: true });
}

export async function PATCH(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const { id, ...updates } = await req.json();
  if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });

  await supabase.from('date_packages').update(updates).eq('id', id);
  return NextResponse.json({ success: true });
}

export async function DELETE(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const { id } = await req.json();
  await supabase.from('date_packages').update({ active: false }).eq('id', id);
  return NextResponse.json({ success: true });
}
