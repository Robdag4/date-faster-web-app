import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// Direct REST helper for admin auth operations (more reliable than JS client)
async function adminAuthFetch(path: string, method = 'GET', body?: any) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/${path}`, {
    method,
    headers: {
      'Authorization': `Bearer ${supabaseServiceKey}`,
      'apikey': supabaseServiceKey,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

export async function POST(req: NextRequest) {
  try {
    const { phoneNumber } = await req.json();
    if (!phoneNumber) {
      return NextResponse.json({ error: 'Phone number required' }, { status: 400 });
    }

    const cleanPhone = phoneNumber.replace(/\D/g, '');
    const fakeEmail = `${cleanPhone}@datefaster.app`;
    const password = cleanPhone + '_df2026';

    const adminClient = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
    const regularClient = createClient(supabaseUrl, supabaseAnonKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // Helper: sign in and return response
    const signInAndRespond = async (userId: string, isNew: boolean) => {
      const { data: sid, error: sie } = await regularClient.auth.signInWithPassword({
        email: fakeEmail, password,
      });
      if (sie) return NextResponse.json({ error: sie.message }, { status: 401 });

      const { data: userData } = await adminClient
        .from('users').select('onboarding_complete').eq('id', userId).single();

      return NextResponse.json({
        token: sid.session?.access_token || '',
        refreshToken: sid.session?.refresh_token || '',
        userId,
        isNew,
        onboardingComplete: userData?.onboarding_complete || false,
      });
    };

    // ── Step 1: Try fake-email sign-in (returning user on new flow) ──
    const { data: signInData, error: signInError } = await regularClient.auth.signInWithPassword({
      email: fakeEmail, password,
    });

    if (!signInError && signInData?.user) {
      const userId = signInData.user.id;
      const { data: userData } = await adminClient
        .from('users').select('onboarding_complete').eq('id', userId).single();

      return NextResponse.json({
        token: signInData.session?.access_token || '',
        refreshToken: signInData.session?.refresh_token || '',
        userId,
        isNew: false,
        onboardingComplete: userData?.onboarding_complete || false,
      });
    }

    // ── Step 2: Check for legacy phone-based auth user ──
    // Check users table first (faster than listing all auth users)
    const { data: existingUserRow } = await adminClient
      .from('users')
      .select('id, onboarding_complete, phone_number')
      .or(`phone_number.eq.${phoneNumber},phone_number.eq.+${cleanPhone},phone_number.eq.${cleanPhone}`)
      .limit(1)
      .single();

    if (existingUserRow) {
      // Found existing user in public table — update their auth record to use fake email
      const updateRes = await adminAuthFetch(`users/${existingUserRow.id}`, 'PUT', {
        email: fakeEmail,
        password,
        email_confirm: true,
      });

      if (updateRes.status === 200) {
        // Delete any duplicate fake-email auth records
        const { data: { users: allUsers } } = await adminClient.auth.admin.listUsers({ perPage: 500 });
        const dupes = (allUsers || []).filter((u: any) => u.email === fakeEmail && u.id !== existingUserRow.id);
        for (const dupe of dupes) {
          await adminAuthFetch(`users/${dupe.id}`, 'DELETE');
        }

        return signInAndRespond(existingUserRow.id, false);
      }
      // If update failed, fall through to create new
    }

    // ── Step 3: Also check auth users directly for phone match ──
    const listRes = await adminAuthFetch('users?per_page=500');
    if (listRes.data?.users) {
      const legacyAuth = listRes.data.users.find((u: any) =>
        u.phone === cleanPhone || u.phone === `+${cleanPhone}` || u.phone === phoneNumber
      );

      if (legacyAuth) {
        await adminAuthFetch(`users/${legacyAuth.id}`, 'PUT', {
          email: fakeEmail,
          password,
          email_confirm: true,
        });

        // Delete dupes
        const dupes = listRes.data.users.filter((u: any) => u.email === fakeEmail && u.id !== legacyAuth.id);
        for (const dupe of dupes) {
          await adminAuthFetch(`users/${dupe.id}`, 'DELETE');
        }

        // Ensure users table row exists
        const { data: userRow } = await adminClient
          .from('users').select('id').eq('id', legacyAuth.id).single();
        if (!userRow) {
          await adminClient.from('users').insert({
            id: legacyAuth.id, phone_number: phoneNumber, first_name: '', age: 0,
          });
        }

        return signInAndRespond(legacyAuth.id, !userRow);
      }
    }

    // ── Step 4: Brand new user ──
    const createRes = await adminAuthFetch('users', 'POST', {
      email: fakeEmail,
      password,
      email_confirm: true,
      user_metadata: { phone_number: phoneNumber },
    });

    if (createRes.status !== 200 || !createRes.data?.id) {
      return NextResponse.json({ error: createRes.data?.msg || 'Failed to create user' }, { status: 500 });
    }

    const userId = createRes.data.id;

    await adminClient.from('users').insert({
      id: userId, phone_number: phoneNumber, first_name: '', age: 0,
    });

    return signInAndRespond(userId, true);

  } catch (err: any) {
    console.error('Phone auth error:', err);
    return NextResponse.json({ error: err.message || 'Auth failed' }, { status: 500 });
  }
}
