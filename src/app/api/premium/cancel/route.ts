import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-04-30.basil' as any });

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient();
    const token = req.headers.get('authorization')?.replace('Bearer ', '');
    if (token) await supabase.auth.setSession({ access_token: token, refresh_token: '' });
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const admin = createAdminClient();
    const { data: user } = await admin.from('users').select('stripe_subscription_id, is_premium').eq('id', authUser.id).single();
    if (!user?.stripe_subscription_id) return NextResponse.json({ error: 'No active subscription' }, { status: 400 });

    await stripe.subscriptions.update(user.stripe_subscription_id, { cancel_at_period_end: true });
    const sub = await stripe.subscriptions.retrieve(user.stripe_subscription_id);
    const cancelAt = new Date((sub as any).current_period_end * 1000).toISOString();
    await admin.from('users').update({ premium_cancel_at: cancelAt }).eq('id', authUser.id);

    return NextResponse.json({ success: true, cancelAt });
  } catch (err: any) {
    console.error('Cancel error:', err.message);
    return NextResponse.json({ error: 'Failed to cancel' }, { status: 500 });
  }
}
