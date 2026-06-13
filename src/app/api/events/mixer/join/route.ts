import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, badRequest, notFound } from '@/lib/events-helpers';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fptwvsylvhzfunpspkej.supabase.co';
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

// Direct REST helper for admin auth operations (matches the phone-auth route).
async function adminAuthFetch(path: string, method = 'POST', body?: any) {
  const res = await fetch(`${supabaseUrl}/auth/v1/admin/${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${serviceKey}`,
      apikey: serviceKey,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  return { status: res.status, data: await res.json().catch(() => null) };
}

/**
 * Guest mixer join — no phone number required.
 *
 * Flow: event code + name (+ optional gender) → create a lightweight guest
 * account → create the public.users profile row → check the guest into the
 * mixer → return a real Supabase session so the rest of the mixer (statements,
 * play, guesses, stars) works unchanged on user_id.
 *
 * The guest account is a normal auth user with a generated email/password
 * (same pattern as phone auth's fake-email trick), so the existing
 * getUserFromToken / (auth) layout all keep working.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const eventCode = String(body.eventCode || '').trim();
  const name = String(body.name || '').trim();
  const genderRaw = String(body.gender || '').trim().toLowerCase();
  const gender = genderRaw === 'male' || genderRaw === 'man'
    ? 'male'
    : genderRaw === 'female' || genderRaw === 'woman'
      ? 'female'
      : 'other';

  if (!eventCode) return badRequest('Event code required');
  if (!name) return badRequest('Name required');
  if (name.length > 40) return badRequest('Name too long');

  const admin = getAdmin();

  // 1. Validate the mixer event is joinable
  const { data: event } = await admin
    .from('speed_events')
    .select('id, name, status, max_capacity')
    .eq('event_code', eventCode)
    .eq('event_type', 'mixer')
    .in('status', ['draft', 'checkin', 'active'])
    .maybeSingle();
  if (!event) return notFound('Mixer event not found or check-in closed');

  // 2. Create a guest auth user (unique email per guest)
  const rand = Math.random().toString(36).slice(2, 10);
  const guestEmail = `guest_${eventCode}_${rand}@mixer.datefaster.app`;
  const guestPassword = `${rand}_${Math.random().toString(36).slice(2, 10)}_dfmixer`;

  const created = await adminAuthFetch('users', 'POST', {
    email: guestEmail,
    password: guestPassword,
    email_confirm: true,
    user_metadata: { guest: true, mixer_event: event.id, display_name: name },
  });
  if (created.status >= 400 || !created.data?.id) {
    console.error('guest create error:', created.status, created.data);
    return NextResponse.json({ error: 'Could not create guest session' }, { status: 500 });
  }
  const userId = created.data.id as string;

  // 3. Create the public.users profile row (first_name is NOT NULL)
  const { error: profileErr } = await admin.from('users').insert({
    id: userId,
    first_name: name,
    age: 0,
    gender,
    onboarding_complete: true,
    created_at: new Date().toISOString(),
  });
  if (profileErr && profileErr.code !== '23505') {
    console.error('guest profile error:', profileErr);
    // Roll back the auth user so we don't orphan it
    await adminAuthFetch(`users/${userId}`, 'DELETE');
    return NextResponse.json({ error: 'Could not create guest profile' }, { status: 500 });
  }

  // 4. Check the guest into the mixer (idempotent-ish; guard capacity)
  const { data: existingCheckin } = await admin
    .from('speed_checkins')
    .select('id')
    .eq('event_id', event.id)
    .eq('user_id', userId)
    .maybeSingle();
  if (!existingCheckin) {
    const { count } = await admin
      .from('speed_checkins')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', event.id);
    if ((count || 0) >= event.max_capacity) {
      await adminAuthFetch(`users/${userId}`, 'DELETE');
      await admin.from('users').delete().eq('id', userId);
      return badRequest('Event is at capacity');
    }
    await admin.from('speed_checkins').insert({
      event_id: event.id,
      user_id: userId,
      gender,
      seat_number: (count || 0) + 1,
    });
  }

  // 5. Establish a real session via password grant (returns access+refresh)
  const tokenRes = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: anonKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: guestEmail, password: guestPassword }),
  });
  const tokenData = await tokenRes.json().catch(() => null);
  if (!tokenRes.ok || !tokenData?.access_token) {
    console.error('guest token error:', tokenRes.status, tokenData);
    return NextResponse.json({ error: 'Could not start guest session' }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    eventId: event.id,
    userId,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
  });
}
