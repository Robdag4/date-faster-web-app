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
  const matchId = req.nextUrl.searchParams.get('match_id');
  if (!matchId) return NextResponse.json({ error: 'match_id required' }, { status: 400 });

  const { data: messages } = await supabase
    .from('messages')
    .select('id, sender_id, content, created_at')
    .eq('match_id', matchId)
    .order('created_at', { ascending: true });

  // Get sender names
  const result: any[] = [];
  const nameCache: Record<string, string> = {};
  for (const msg of messages || []) {
    if (!nameCache[msg.sender_id]) {
      const { data } = await supabase.from('users').select('first_name').eq('id', msg.sender_id).single();
      nameCache[msg.sender_id] = data?.first_name || 'Unknown';
    }
    result.push({ ...msg, sender_name: nameCache[msg.sender_id] });
  }

  return NextResponse.json(result);
}
