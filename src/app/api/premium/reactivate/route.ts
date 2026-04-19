import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-04-30.basil' as any });
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST() {
  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('stripe_subscription_id')
      .eq('id', authUser.id)
      .single();

    if (!user?.stripe_subscription_id) return NextResponse.json({ error: 'No subscription' }, { status: 400 });

    await stripe.subscriptions.update(user.stripe_subscription_id, { cancel_at_period_end: false });
    await supabaseAdmin.from('users').update({ premium_cancel_at: null }).eq('id', authUser.id);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('Reactivate error:', err.message);
    return NextResponse.json({ error: 'Failed to reactivate' }, { status: 500 });
  }
}
