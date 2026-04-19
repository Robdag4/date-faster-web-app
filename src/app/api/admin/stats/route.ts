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

  const [
    { count: totalUsers },
    { count: activeMatches },
    { count: pendingReports },
    { count: totalPayments },
    revenueResult,
    creditsResult,
  ] = await Promise.all([
    supabase.from('users').select('*', { count: 'exact', head: true }).is('deleted_at', null),
    supabase.from('matches').select('*', { count: 'exact', head: true }).neq('status', 'unmatched'),
    supabase.from('reports').select('*', { count: 'exact', head: true }).eq('status', 'pending'),
    supabase.from('payments').select('*', { count: 'exact', head: true }).eq('status', 'completed'),
    supabase.from('payments').select('amount_cents').eq('status', 'completed'),
    supabase.from('credits_transactions').select('amount_cents'),
  ]);

  const totalRevenue = (revenueResult.data || []).reduce((sum: number, r: any) => sum + (r.amount_cents || 0), 0);
  const totalCreditsIssued = (creditsResult.data || []).reduce((sum: number, r: any) => sum + (r.amount_cents || 0), 0);

  return NextResponse.json({
    totalUsers: totalUsers || 0,
    activeMatches: activeMatches || 0,
    pendingReports: pendingReports || 0,
    totalRevenue,
    totalPayments: totalPayments || 0,
    totalCreditsIssued,
  });
}
