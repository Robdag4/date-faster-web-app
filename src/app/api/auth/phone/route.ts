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

    const regularClient = createClient(supabaseUrl, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const fakeEmail = `${cleanPhone}@datefaster.app`;
    const password = cleanPhone + '_df2026';

    // ── Step 1: Try signing in with fake-email (returning user on new flow) ──
    const { data: signInData, error: signInError } = await regularClient.auth.signInWithPassword({
      email: fakeEmail,
      password,
    });

    if (!signInError && signInData?.user) {
      const userId = signInData.user.id;
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

    // ── Step 2: Check for legacy phone-based auth user ──
    // Search auth users by phone number (old OTP flow created these)
    const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers({ perPage: 1000 });
    const legacyUser = allUsers?.find(u => u.phone === cleanPhone || u.phone === `+${cleanPhone}` || u.phone === phoneNumber);

    if (legacyUser) {
      // Migrate: add fake email + password so new flow works
      await adminClient.auth.admin.updateUser(legacyUser.id, {
        email: fakeEmail,
        password,
        email_confirm: true,
      });

      // Delete any duplicate fake-email auth record that may have been created
      const dupeUser = allUsers?.find(u => u.email === fakeEmail && u.id !== legacyUser.id);
      if (dupeUser) {
        await adminClient.auth.admin.deleteUser(dupeUser.id);
      }

      // Sign in with new credentials
      const { data: migratedData, error: migratedError } = await regularClient.auth.signInWithPassword({
        email: fakeEmail,
        password,
      });

      if (migratedError) {
        return NextResponse.json({ error: migratedError.message }, { status: 401 });
      }

      const { data: userData } = await adminClient
        .from('users')
        .select('onboarding_complete')
        .eq('id', legacyUser.id)
        .single();

      return NextResponse.json({
        token: migratedData.session?.access_token || '',
        refreshToken: migratedData.session?.refresh_token || '',
        userId: legacyUser.id,
        isNew: !userData,
        onboardingComplete: userData?.onboarding_complete || false,
      });
    }

    // ── Step 3: Check for existing fake-email user with wrong password ──
    const existingEmailUser = allUsers?.find(u => u.email === fakeEmail);
    if (existingEmailUser) {
      await adminClient.auth.admin.updateUser(existingEmailUser.id, {
        password,
        email_confirm: true,
      });

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
        .eq('id', existingEmailUser.id)
        .single();

      return NextResponse.json({
        token: retryData.session?.access_token || '',
        refreshToken: retryData.session?.refresh_token || '',
        userId: existingEmailUser.id,
        isNew: !userData,
        onboardingComplete: userData?.onboarding_complete || false,
      });
    }

    // ── Step 4: Brand new user — create account ──
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email: fakeEmail,
      password,
      email_confirm: true,
      user_metadata: { phone_number: phoneNumber },
    });

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    const userId = newUser.user.id;

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
