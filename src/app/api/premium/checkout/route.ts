import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

const PREMIUM_PRICE_ID = process.env.STRIPE_PREMIUM_PRICE_ID || 'price_1T9dUNK1RLJk3sxZxtTLL6B6';
const FRONTEND_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://app.datefaster.com';

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getAdmin();
    const { data: { user: authUser }, error: authError } = await admin.auth.getUser(authHeader.slice(7));
    if (authError || !authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: user } = await admin.from('users').select('id, phone_number, stripe_customer_id, is_premium').eq('id', authUser.id).single();
    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });
    if (user.is_premium) return NextResponse.json({ error: 'Already premium' }, { status: 400 });

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-04-30.basil' as any });

    let customerId = user.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({ phone: user.phone_number || undefined, metadata: { userId: user.id } });
      customerId = customer.id;
      await admin.from('users').update({ stripe_customer_id: customerId }).eq('id', user.id);
    }

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: 'subscription',
      line_items: [{ price: PREMIUM_PRICE_ID, quantity: 1 }],
      success_url: `${FRONTEND_URL}/premium?success=1`,
      cancel_url: `${FRONTEND_URL}/premium?canceled=1`,
      metadata: { userId: user.id },
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (err: any) {
    console.error('Premium checkout error:', err.message);
    return NextResponse.json({ error: err.message || 'Failed to create checkout session' }, { status: 500 });
  }
}
