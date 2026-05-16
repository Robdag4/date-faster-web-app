import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fptwvsylvhzfunpspkej.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { userId, profile } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Upsert profile — handles both existing rows and missing rows
    // Always clear deleted_at in case this is a re-activated account
    const { error } = await admin.from('users').upsert({
      id: userId,
      ...profile,
      onboarding_complete: true,
      deleted_at: null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    if (error) {
      console.error('onboarding/complete error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('onboarding/complete exception:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
