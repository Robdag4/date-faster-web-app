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

  // Find users sharing IPs
  const { data: users } = await supabase.from('users').select('id, first_name, phone_number, last_ip, last_device_fingerprint, last_login_at, locked_at').not('last_ip', 'is', null);

  const ipGroups: Record<string, any[]> = {};
  const fpGroups: Record<string, any[]> = {};

  for (const u of users || []) {
    if (u.last_ip) {
      if (!ipGroups[u.last_ip]) ipGroups[u.last_ip] = [];
      ipGroups[u.last_ip].push(u);
    }
    if (u.last_device_fingerprint) {
      if (!fpGroups[u.last_device_fingerprint]) fpGroups[u.last_device_fingerprint] = [];
      fpGroups[u.last_device_fingerprint].push(u);
    }
  }

  return NextResponse.json({
    duplicateIPs: Object.entries(ipGroups).filter(([, v]) => v.length > 1).map(([ip, users]) => ({ ip, users })),
    duplicateFingerprints: Object.entries(fpGroups).filter(([, v]) => v.length > 1).map(([fingerprint, users]) => ({ fingerprint, users })),
  });
}
