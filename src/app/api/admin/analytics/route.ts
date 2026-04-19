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

  const { data: payments } = await supabase.from('payments').select('amount_cents, payer_id, created_at').eq('status', 'completed');
  const totalRevenue = (payments || []).reduce((s: number, p: any) => s + (p.amount_cents || 0), 0);

  // Avg spend per user
  const spendByUser: Record<string, number> = {};
  for (const p of payments || []) {
    spendByUser[p.payer_id] = (spendByUser[p.payer_id] || 0) + (p.amount_cents || 0);
  }
  const userSpends = Object.values(spendByUser);
  const avgSpendPerUser = userSpends.length > 0 ? Math.round(userSpends.reduce((a, b) => a + b, 0) / userSpends.length) : 0;

  // Popular packages
  const { data: packages } = await supabase.from('date_packages').select('id, name, category, price_cents');
  const { data: dateRequests } = await supabase.from('date_requests').select('id, package_id');
  const { data: allPayments } = await supabase.from('payments').select('date_request_id, amount_cents, status');

  const packageStats = (packages || []).map(pkg => {
    const drs = (dateRequests || []).filter(dr => dr.package_id === pkg.id);
    const drIds = new Set(drs.map(dr => dr.id));
    const paidPayments = (allPayments || []).filter(p => p.status === 'completed' && drIds.has(p.date_request_id));
    return {
      ...pkg,
      times_purchased: drs.length,
      total_revenue: paidPayments.reduce((s: number, p: any) => s + (p.amount_cents || 0), 0),
    };
  }).sort((a, b) => b.times_purchased - a.times_purchased);

  // Conversion funnel
  const { count: totalMatches } = await supabase.from('matches').select('*', { count: 'exact', head: true });
  const { data: drMatches } = await supabase.from('date_requests').select('match_id');
  const uniqueDrMatches = new Set((drMatches || []).map(d => d.match_id)).size;
  const { data: paidMatches } = await supabase.from('payments').select('match_id').eq('status', 'completed');
  const uniquePaidMatches = new Set((paidMatches || []).map(p => p.match_id)).size;

  // Active users
  const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).is('deleted_at', null);
  const now = new Date();
  const day1 = new Date(now.getTime() - 86400000).toISOString();
  const day7 = new Date(now.getTime() - 7 * 86400000).toISOString();
  const day30 = new Date(now.getTime() - 30 * 86400000).toISOString();

  const { data: dailyMsgs } = await supabase.from('messages').select('sender_id').gte('created_at', day1);
  const { data: weeklyMsgs } = await supabase.from('messages').select('sender_id').gte('created_at', day7);
  const { data: monthlyMsgs } = await supabase.from('messages').select('sender_id').gte('created_at', day30);

  return NextResponse.json({
    totalRevenue,
    avgSpendPerUser,
    popularPackages: packageStats,
    conversionRate: {
      totalMatches: totalMatches || 0,
      matchesWithDateRequests: uniqueDrMatches,
      matchesWithPayments: uniquePaidMatches,
      requestRate: (totalMatches || 0) > 0 ? ((uniqueDrMatches / (totalMatches || 1)) * 100).toFixed(1) : '0.0',
      purchaseRate: (totalMatches || 0) > 0 ? ((uniquePaidMatches / (totalMatches || 1)) * 100).toFixed(1) : '0.0',
    },
    activeUsers: {
      total: totalUsers || 0,
      daily: new Set((dailyMsgs || []).map(m => m.sender_id)).size,
      weekly: new Set((weeklyMsgs || []).map(m => m.sender_id)).size,
      monthly: new Set((monthlyMsgs || []).map(m => m.sender_id)).size,
    },
  });
}
