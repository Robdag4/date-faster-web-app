import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase';

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (token) await supabase.auth.setSession({ access_token: token, refresh_token: '' });
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const { data: user } = await admin.from('users').select('is_premium, stripe_subscription_id, premium_cancel_at').eq('id', authUser.id).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      isPremium: !!user.is_premium,
      subscriptionId: user.stripe_subscription_id || null,
      cancelAt: user.premium_cancel_at || null,
    });
  } catch {
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
