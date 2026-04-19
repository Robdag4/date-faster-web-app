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
  const { data: reports } = await supabase.from('reports').select('*').order('created_at', { ascending: false });

  const result: any[] = [];
  for (const r of reports || []) {
    const { data: reporter } = await supabase.from('users').select('first_name, phone_number').eq('id', r.reporter_id).single();
    const { data: reported } = await supabase.from('users').select('first_name, phone_number').eq('id', r.reported_id).single();
    result.push({
      ...r,
      reporter_name: reporter?.first_name || 'Unknown',
      reporter_phone: reporter?.phone_number || '',
      reported_name: reported?.first_name || 'Unknown',
      reported_phone: reported?.phone_number || '',
    });
  }

  return NextResponse.json(result);
}

export async function PATCH(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const { id, action, adminNote } = await req.json();

  if (!['warn', 'ban', 'dismiss'].includes(action)) {
    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  }

  const { data: report } = await supabase.from('reports').select('*').eq('id', id).single();
  if (!report) return NextResponse.json({ error: 'Report not found' }, { status: 404 });

  const statusMap: Record<string, string> = { warn: 'warned', ban: 'banned', dismiss: 'dismissed' };
  await supabase.from('reports').update({ status: statusMap[action], admin_note: adminNote || '', updated_at: new Date().toISOString() }).eq('id', id);

  if (action === 'ban') {
    await supabase.from('users').update({ locked_at: new Date().toISOString() }).eq('id', report.reported_id);
  }

  return NextResponse.json({ success: true, status: statusMap[action] });
}
