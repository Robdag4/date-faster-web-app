import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

// Premium user "matches back" with someone who liked them
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const admin = getAdmin();
    const { data: { user }, error } = await admin.auth.getUser(authHeader.slice(7));
    if (error || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: me } = await admin.from('users').select('is_premium').eq('id', user.id).single();
    if (!me?.is_premium) {
      return NextResponse.json({ error: 'Premium feature' }, { status: 403 });
    }

    const { targetId } = await req.json();
    if (!targetId) return NextResponse.json({ error: 'targetId required' }, { status: 400 });

    // Verify they actually liked us
    const { data: theirSwipe } = await admin.from('swipes')
      .select('id').eq('swiper_id', targetId).eq('swiped_id', user.id).eq('direction', 'like').single();

    if (!theirSwipe) return NextResponse.json({ error: 'This person has not liked you' }, { status: 400 });

    // Insert our like swipe
    await admin.from('swipes').upsert(
      { swiper_id: user.id, swiped_id: targetId, direction: 'like' },
      { onConflict: 'swiper_id,swiped_id' }
    );

    // Create match
    const [user1Id, user2Id] = [user.id, targetId].sort();
    const { data: existing } = await admin.from('matches')
      .select('id').eq('user1_id', user1Id).eq('user2_id', user2Id).single();

    if (existing) {
      return NextResponse.json({ success: true, matchId: existing.id, alreadyMatched: true });
    }

    const { data: newMatch } = await admin.from('matches')
      .insert({ user1_id: user1Id, user2_id: user2Id, status: 'matched', source: 'swipe' })
      .select('id').single();

    return NextResponse.json({ success: true, matchId: newMatch?.id, matched: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
