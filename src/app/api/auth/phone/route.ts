import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber } = await req.json();
    
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const fakeEmail = `${cleanPhone}@datefaster.app`;
    const password = cleanPhone + '_df2026';

    // Check if user exists in auth by listing users
    const { data: existingUsers } = await adminClient.auth.admin.listUsers({ perPage: 1 });
    
    // Try to find user by email
    let userId: string | null = null;
    
    // Try sign in first
    const regularClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    
    const { data: signInData, error: signInError } = await regularClient.auth.signInWithPassword({
      email: fakeEmail,
      password,
    });

    if (!signInError && signInData?.user) {
      // Existing user — sign in succeeded
      userId = signInData.user.id;
      
      // Check users table
      const { data: userData } = await adminClient
        .from('users')
        .select('onboarding_complete')
        .eq('id', userId)
        .single();

      return NextResponse.json({
        token: signInData.session?.access_token || '',
        refreshToken: signInData.session?.refresh_token || '',
        userId,
        isNew: false,
        onboardingComplete: userData?.onboarding_complete || false,
      });
    }

    // User doesn't exist — create via admin API (auto-confirmed)
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: fakeEmail,
      password,
      email_confirm: true, // Auto-confirm
      user_metadata: { phone_number: phoneNumber },
    });

    if (createError) {
      // If user already exists but password is wrong (from old OTP flow), update password
      if (createError.message?.includes('already been registered') || createError.message?.includes('already exists')) {
        // Find and update the user
        const { data: { users } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
        const existing = users?.find(u => u.email === fakeEmail);
        
        if (existing) {
          await adminClient.auth.admin.updateUser(existing.id, { 
            password,
            email_confirm: true,
          });
          
          // Now sign in
          const { data: retryData, error: retryError } = await regularClient.auth.signInWithPassword({
            email: fakeEmail,
            password,
          });

          if (retryError) {
            return NextResponse.json({ error: retryError.message }, { status: 401 });
          }

          const { data: userData } = await adminClient
            .from('users')
            .select('onboarding_complete')
            .eq('id', existing.id)
            .single();

          return NextResponse.json({
            token: retryData.session?.access_token || '',
            refreshToken: retryData.session?.refresh_token || '',
            userId: existing.id,
            isNew: !userData,
            onboardingComplete: userData?.onboarding_complete || false,
          });
        }
      }
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    userId = newUser.user.id;

    // Create users table record
    await adminClient.from('users').insert({
      id: userId,
      phone_number: phoneNumber,
      first_name: '',
      age: 0,
    });

    // Sign in to get session tokens
    const { data: sessionData, error: sessionError } = await regularClient.auth.signInWithPassword({
      email: fakeEmail,
      password,
    });

    if (sessionError) {
      return NextResponse.json({ error: sessionError.message }, { status: 500 });
    }

    return NextResponse.json({
      token: sessionData.session?.access_token || '',
      refreshToken: sessionData.session?.refresh_token || '',
      userId,
      isNew: true,
      onboardingComplete: false,
    });

  } catch (err: any) {
    console.error('Phone auth error:', err);
    return NextResponse.json({ error: err.message || 'Auth failed' }, { status: 500 });
  }
}
