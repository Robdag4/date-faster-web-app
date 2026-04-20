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
    const { data: { user }, error } = await admin.auth.getUser(authHeader.slice(7));
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Get user's premium status
    const { data: me } = await admin.from('users').select('is_premium').eq('id', user.id).single();

    // Find people who liked me but I haven't swiped on yet (no existing match)
    const { data: likers } = await admin
      .from('swipes')
      .select('swiper_id')
      .eq('swiped_id', user.id)
      .eq('direction', 'like');

    if (!likers || likers.length === 0) {
      return NextResponse.json({ count: 0, profiles: [] });
    }

    const likerIds = likers.map(l => l.swiper_id);

    // Exclude people I've already swiped on (they'd be matches already)
    const { data: mySwipes } = await admin
      .from('swipes')
      .select('swiped_id')
      .eq('swiper_id', user.id);
    const swipedIds = new Set((mySwipes || []).map(s => s.swiped_id));

    const unswipedLikers = likerIds.filter(id => !swipedIds.has(id));

    if (unswipedLikers.length === 0) {
      return NextResponse.json({ count: 0, profiles: [] });
    }

    // For premium: return full profiles. For free: return blurred data only.
    if (me?.is_premium) {
      const { data: profiles } = await admin
        .from('users')
        .select('id, first_name, age, photos, job_title')
        .in('id', unswipedLikers)
        .eq('onboarding_complete', true)
        .is('deleted_at', null);

      return NextResponse.json({
        count: unswipedLikers.length,
        profiles: (profiles || []).map(p => ({
          id: p.id,
          first_name: p.first_name,
          age: p.age,
          photo: p.photos?.[0] || null,
          job_title: p.job_title,
        })),
      });
    }

    // Free users: just count + blurred preview photos (no IDs, no names)
    const { data: profiles } = await admin
      .from('users')
      .select('photos')
      .in('id', unswipedLikers)
      .eq('onboarding_complete', true)
      .is('deleted_at', null)
      .limit(6);

    return NextResponse.json({
      count: unswipedLikers.length,
      profiles: (profiles || []).map(p => ({
        photo: p.photos?.[0] || null,
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
