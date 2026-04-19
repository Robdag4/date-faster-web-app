import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { v4 as uuid } from 'uuid';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { 
  apiVersion: '2024-12-18.acacia' 
});

const FRONTEND_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export async function POST(request: NextRequest) {
  try {
    const { dateRequestId, useCredits } = await request.json();

    if (!dateRequestId) {
      return NextResponse.json({ 
        error: 'dateRequestId required' 
      }, { status: 400 });
    }

    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get date request with package details
    const { data: dateReq, error: reqError } = await supabase
      .from('date_requests')
      .select(`
        *,
        date_packages (
          price_cents,
          name,
          description
        )
      `)
      .eq('id', dateRequestId)
      .eq('status', 'accepted')
      .single();

    if (reqError || !dateReq) {
      return NextResponse.json({ 
        error: 'Accepted date request not found' 
      }, { status: 404 });
    }

    // Determine actual price (use counter package if exists)
    let amountCents = dateReq.date_packages.price_cents;
    let packageName = dateReq.date_packages.name;
    let packageDescription = dateReq.date_packages.description;

    if (dateReq.counter_package_id) {
      const { data: counterPkg } = await supabase
        .from('date_packages')
        .select('price_cents, name, description')
        .eq('id', dateReq.counter_package_id)
        .single();

      if (counterPkg) {
        amountCents = counterPkg.price_cents;
        packageName = counterPkg.name;
        packageDescription = counterPkg.description;
      }
    }

    // Apply credits if requested
    let creditsApplied = 0;
    if (useCredits) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('credits_balance')
        .eq('id', user.id)
        .single();

      const balance = userProfile?.credits_balance || 0;
      creditsApplied = Math.min(balance, amountCents);
      amountCents -= creditsApplied;

      if (creditsApplied > 0) {
        // Deduct credits
        await supabase
          .from('users')
          .update({ 
            credits_balance: balance - creditsApplied,
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id);

        // Record credit usage
        await supabase
          .from('credits_history')
          .insert({
            id: uuid(),
            user_id: user.id,
            amount_cents: -creditsApplied,
            reason: `Applied to date payment (${dateRequestId.slice(0, 8)})`
          });
      }
    }

    // Create payment record
    const paymentId = uuid();
    const { error: paymentError } = await supabase
      .from('payments')
      .insert({
        id: paymentId,
        match_id: dateReq.match_id,
        date_request_id: dateRequestId,
        payer_id: user.id,
        amount_cents: amountCents
      });

    if (paymentError) {
      return NextResponse.json({ error: 'Failed to create payment record' }, { status: 500 });
    }

    // If fully covered by credits, complete immediately
    if (amountCents === 0) {
      await completePayment(supabase, paymentId);
      return NextResponse.json({
        paymentId,
        amountCents: 0,
        creditsApplied,
        paid: true,
        message: 'Fully covered by credits!'
      });
    }

    // Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: packageName || 'Date Package',
            description: packageDescription || 'Date Faster date package',
          },
          unit_amount: amountCents,
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${FRONTEND_URL}/matches/${dateReq.match_id}/payment?dateRequestId=${dateRequestId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${FRONTEND_URL}/matches/${dateReq.match_id}/payment?dateRequestId=${dateRequestId}&cancelled=true`,
      metadata: {
        paymentId,
        dateRequestId,
        matchId: dateReq.match_id,
        userId: user.id,
      },
    });

    // Store stripe session ID
    await supabase
      .from('payments')
      .update({ stripe_session_id: session.id })
      .eq('id', paymentId);

    return NextResponse.json({
      paymentId,
      amountCents,
      creditsApplied,
      checkoutUrl: session.url,
      message: 'Redirect to Stripe checkout.',
    });

  } catch (error) {
    console.error('Payment initiate error:', error);
    return NextResponse.json({ error: 'Payment initiation failed' }, { status: 500 });
  }
}

async function completePayment(supabase: any, paymentId: string) {
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (!payment) return;

  // Update payment status
  await supabase
    .from('payments')
    .update({ status: 'completed' })
    .eq('id', paymentId);

  // Update match status
  await supabase
    .from('matches')
    .update({ status: 'paid' })
    .eq('id', payment.match_id);

  // Generate redemption code
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let attempts = 0; attempts < 10; attempts++) {
    code = Array.from({ length: 6 }, () => 
      chars[Math.floor(Math.random() * chars.length)]
    ).join('');
    
    const { data: existing } = await supabase
      .from('date_requests')
      .select('id')
      .eq('redemption_code', code)
      .single();
      
    if (!existing) break;
  }

  await supabase
    .from('date_requests')
    .update({ redemption_code: code })
    .eq('id', payment.date_request_id);

  return { code };
}