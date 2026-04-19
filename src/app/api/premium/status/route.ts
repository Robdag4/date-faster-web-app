import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  try {
    const supabase = createServerComponentClient({ cookies });
    const { data: { user: authUser } } = await supabase.auth.getUser();
    if (!authUser) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: user } = await supabaseAdmin
      .from('users')
      .select('is_premium, stripe_subscription_id, premium_cancel_at')
      .eq('id', authUser.id)
      .single();

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      isPremium: !!user.is_premium,
      subscriptionId: user.stripe_subscription_id || null,
      cancelAt: user.premium_cancel_at || null,
    });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to get status' }, { status: 500 });
  }
}
