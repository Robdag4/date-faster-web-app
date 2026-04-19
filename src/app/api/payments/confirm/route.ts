import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { v4 as uuid } from 'uuid';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || '', { 
  apiVersion: '2024-12-18.acacia' 
});

export async function POST(request: NextRequest) {
  try {
    const { sessionId, paymentId } = await request.json();

    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // If paymentId provided directly (credits-only flow), check if already completed
    if (paymentId && !sessionId) {
      const { data: payment } = await supabase
        .from('payments')
        .select('*')
        .eq('id', paymentId)
        .single();

      if (!payment) {
        return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
      }

      if (payment.status === 'completed') {
        return NextResponse.json({ 
          success: true, 
          message: 'Payment already confirmed.' 
        });
      }
    }

    if (!sessionId) {
      return NextResponse.json({ 
        error: 'Stripe session ID required' 
      }, { status: 400 });
    }

    // Verify with Stripe
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    if (session.payment_status !== 'paid') {
      return NextResponse.json({ 
        error: 'Payment not completed on Stripe' 
      }, { status: 400 });
    }

    const pid = session.metadata?.paymentId;
    if (!pid) {
      return NextResponse.json({ 
        error: 'Invalid session metadata' 
      }, { status: 400 });
    }

    // Check if payment exists and is pending
    const { data: payment } = await supabase
      .from('payments')
      .select('*')
      .eq('id', pid)
      .eq('status', 'pending')
      .single();

    if (!payment) {
      // Check if already completed (idempotent)
      const { data: existing } = await supabase
        .from('payments')
        .select('*')
        .eq('id', pid)
        .single();

      if (existing?.status === 'completed') {
        return NextResponse.json({ 
          success: true, 
          message: 'Payment already confirmed.' 
        });
      }

      return NextResponse.json({ 
        error: 'Pending payment not found' 
      }, { status: 404 });
    }

    const result = await completePayment(supabase, pid);

    return NextResponse.json({ 
      success: true, 
      message: 'Payment confirmed. Chat is now unlocked!', 
      redemptionCode: result.code 
    });

  } catch (error) {
    console.error('Payment confirm error:', error);
    return NextResponse.json({ error: 'Payment confirmation failed' }, { status: 500 });
  }
}

async function completePayment(supabase: any, paymentId: string) {
  const { data: payment } = await supabase
    .from('payments')
    .select('*')
    .eq('id', paymentId)
    .single();

  if (!payment) return { code: null };

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

  // Generate unique redemption code
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