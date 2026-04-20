import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function GET(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(authHeader.slice(7));
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Get user profile
    const { data: me } = await admin.from('users').select('*').eq('id', user.id).single();
    if (!me) return NextResponse.json([]);

    // Get already swiped
    const { data: swipes } = await admin.from('swipes').select('swiped_id').eq('swiper_id', user.id);
    const swipedIds = (swipes || []).map((s: any) => s.swiped_id);
    swipedIds.push(user.id);

    // Build query
    let query = admin
      .from('users')
      .select('id, first_name, age, gender, bio, job_title, tagline, interests, ideal_date, relationship_goal, photos, is_premium, latitude, longitude')
      .eq('onboarding_complete', true)
      .is('deleted_at', null)
      .eq('locked', false)
      .gte('age', me.age_min || 18)
      .lte('age', me.age_max || 99);

    if (swipedIds.length > 0) {
      query = query.not('id', 'in', `(${swipedIds.map((id: string) => `"${id}"`).join(',')})`);
    }

    if (me.preference === 'women') query = query.eq('gender', 'female');
    else if (me.preference === 'men') query = query.eq('gender', 'male');

    if (!me.incognito_plus) query = query.eq('incognito', false);

    const { data: profiles, error } = await query.limit(50);
    if (error || !profiles) return NextResponse.json([]);

    // Filter: min 3 photos
    const withPhotos = profiles.filter((p: any) => {
      const photos = Array.isArray(p.photos) ? p.photos.filter((url: string) => url) : [];
      return photos.length >= 3;
    });

    // Distance calc
    const maxDist = me.discovery_radius || 25;
    const myLat = me.custom_latitude || me.latitude || 40.7128;
    const myLng = me.custom_longitude || me.longitude || -74.006;

    const withDistance = withPhotos.map((p: any) => {
      if (!p.latitude && !p.longitude) return { ...p, distance: null };
      const R = 3959;
      const dLat = (p.latitude - myLat) * Math.PI / 180;
      const dLon = (p.longitude - myLng) * Math.PI / 180;
      const a = Math.sin(dLat / 2) ** 2 + Math.cos(myLat * Math.PI / 180) * Math.cos(p.latitude * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
      const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      return { ...p, distance: Math.round(dist) };
    }).filter((p: any) => p.distance === null || p.distance <= maxDist);

    // Sort: premium first, then random
    withDistance.sort((a: any, b: any) => {
      if (a.is_premium && !b.is_premium) return -1;
      if (!a.is_premium && b.is_premium) return 1;
      return Math.random() - 0.5;
    });

    return NextResponse.json(withDistance);
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
