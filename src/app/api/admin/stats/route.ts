import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'admin-secret-token';

function checkAdminAuth(request: NextRequest): boolean {
  const authHeader = request.headers.get('authorization');
  return authHeader === `Bearer ${ADMIN_TOKEN}`;
}

export async function GET(request: NextRequest) {
  try {
    if (!checkAdminAuth(request)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabase = createClient();

    // Get basic stats
    const [
      { count: totalUsers },
      { count: activeMatches },
      { count: pendingReports },
      { count: totalPayments }
    ] = await Promise.all([
      supabase.from('users').select('*', { count: 'exact' }).is('deleted_at', null),
      supabase.from('matches').select('*', { count: 'exact' }).neq('status', 'unmatched'),
      supabase.from('reports').select('*', { count: 'exact' }).eq('status', 'pending'),
      supabase.from('payments').select('*', { count: 'exact' }).eq('status', 'completed')
    ]);

    // Get revenue
    const { data: revenueData } = await supabase
      .from('payments')
      .select('amount_cents')
      .eq('status', 'completed');

    const totalRevenue = revenueData?.reduce((sum, p) => sum + (p.amount_cents || 0), 0) || 0;

    // Get credits issued
    const { data: creditsData } = await supabase
      .from('credits_history')
      .select('amount_cents');

    const totalCreditsIssued = creditsData?.reduce((sum, c) => sum + Math.abs(c.amount_cents || 0), 0) || 0;

    return NextResponse.json({
      totalUsers: totalUsers || 0,
      activeMatches: activeMatches || 0,
      pendingReports: pendingReports || 0,
      totalRevenue,
      totalPayments: totalPayments || 0,
      totalCreditsIssued,
    });

  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}