import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-secret-token-change-me';

export function checkAdminAuth(req: NextRequest): boolean {
  const header = req.headers.get('authorization');
  return !!(header?.startsWith('Bearer ') && header.slice(7) === ADMIN_TOKEN);
}

export async function getUserFromToken(req: NextRequest): Promise<{ id: string; [key: string]: any } | null> {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ')) return null;
  const token = header.slice(7);
  const admin = getAdmin();
  const { data: { user }, error } = await admin.auth.getUser(token);
  if (error || !user) return null;
  return user as any;
}

export function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

export function badRequest(msg: string) {
  return NextResponse.json({ error: msg }, { status: 400 });
}

export function notFound(msg = 'Not found') {
  return NextResponse.json({ error: msg }, { status: 404 });
}

const adjectives = ['swift','bold','keen','calm','bright','quick','sharp','cool','warm','fair'];
const animals = ['fox','owl','wolf','hawk','bear','deer','lynx','crow','dove','pike'];

export function generateHostUsername(): string {
  return adjectives[Math.floor(Math.random() * adjectives.length)] +
    animals[Math.floor(Math.random() * animals.length)] +
    String(Math.floor(10 + Math.random() * 90));
}

export async function generateEventCode(admin: any): Promise<string> {
  for (let i = 0; i < 20; i++) {
    const code = String(Math.floor(1000 + Math.random() * 9000));
    const { data } = await admin.from('speed_events').select('id').eq('event_code', code).neq('status', 'completed').maybeSingle();
    if (!data) return code;
  }
  return String(Math.floor(1000 + Math.random() * 9000));
}
