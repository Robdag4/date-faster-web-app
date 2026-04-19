import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { apiVersion: '2025-04-30.basil' as any });
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET || '';
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: NextRequest) {
  const body = await req.text();
  const sig = req.headers.get('stripe-signature') || '';

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
  } catch (err: any) {
    console.error('Webhook signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        if (!userId || session.mode !== 'subscription') break;

        await supabaseAdmin.from('users').update({
          is_premium: true,
          stripe_subscription_id: session.subscription as string,
          premium_cancel_at: null,
        }).eq('id', userId);
        break;
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription;
        // Find user by subscription ID
        const { data: user } = await supabaseAdmin
          .from('users')
          .select('id')
          .eq('stripe_subscription_id', sub.id)
          .single();

        if (user) {
          await supabaseAdmin.from('users').update({
            is_premium: false,
            stripe_subscription_id: null,
            premium_cancel_at: null,
          }).eq('id', user.id);
        }
        break;
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (subId) {
          const { data: user } = await supabaseAdmin
            .from('users')
            .select('id')
            .eq('stripe_subscription_id', subId)
            .single();
          // Could notify user, for now just log
          if (user) console.log(`Payment failed for user ${user.id}`);
        }
        break;
      }
    }
  } catch (err: any) {
    console.error('Webhook handler error:', err.message);
  }

  return NextResponse.json({ received: true });
}
