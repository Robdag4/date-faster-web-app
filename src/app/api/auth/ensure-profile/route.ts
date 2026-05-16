import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fptwvsylvhzfunpspkej.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export async function POST(req: NextRequest) {
  try {
    const { userId } = await req.json();
    if (!userId) {
      return NextResponse.json({ error: 'userId required' }, { status: 400 });
    }

    const admin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Check if row exists (including soft-deleted)
    const { data: existing } = await admin
      .from('users')
      .select('id, deleted_at')
      .eq('id', userId)
      .maybeSingle();

    if (existing && existing.deleted_at) {
      // Un-delete the soft-deleted row
      await admin.from('users').update({
        deleted_at: null,
        first_name: '',
        onboarding_complete: false,
      }).eq('id', userId);
      return NextResponse.json({ status: 'undeleted' });
    }

    if (existing) {
      // Row exists and is active — nothing to do
      return NextResponse.json({ status: 'exists' });
    }

    // Create skeleton row
    const { error } = await admin.from('users').insert({
      id: userId,
      first_name: '',
      age: 0,
      onboarding_complete: false,
    });

    if (error) {
      // Could be race condition duplicate — that's fine
      if (error.code === '23505') {
        return NextResponse.json({ status: 'exists' });
      }
      console.error('ensure-profile insert error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ status: 'created' });
  } catch (err: any) {
    console.error('ensure-profile error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
