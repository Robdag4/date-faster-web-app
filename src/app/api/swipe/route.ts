import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.SUPABASE_SERVICE_ROLE_KEY || 'placeholder',
    { auth: { persistSession: false, autoRefreshToken: false } }
  );
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const token = authHeader.slice(7);

    // Verify user from token
    const admin = getAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(token);
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    const { targetId, direction } = await req.json();
    if (!targetId || !['like', 'pass'].includes(direction)) {
      return NextResponse.json({ error: 'Invalid params' }, { status: 400 });
    }

    // Upsert swipe (handles re-swipes gracefully)
    const { error: swipeError } = await admin
      .from('swipes')
      .upsert(
        { swiper_id: user.id, swiped_id: targetId, direction },
        { onConflict: 'swiper_id,swiped_id' }
      );

    if (swipeError) {
      return NextResponse.json({ error: swipeError.message }, { status: 400 });
    }

    let matched = false;
    let matchId: string | null = null;

    if (direction === 'like') {
      // Check for mutual like
      const { data: reverseSwipe } = await admin
        .from('swipes')
        .select('id')
        .eq('swiper_id', targetId)
        .eq('swiped_id', user.id)
        .eq('direction', 'like')
        .single();

      if (reverseSwipe) {
        const [user1Id, user2Id] = [user.id, targetId].sort();
        // Check if match already exists
        const { data: existingMatch } = await admin
          .from('matches')
          .select('id')
          .eq('user1_id', user1Id)
          .eq('user2_id', user2Id)
          .single();

        if (existingMatch) {
          matched = true;
          matchId = existingMatch.id;
        } else {
          const { data: newMatch } = await admin
            .from('matches')
            .insert({ user1_id: user1Id, user2_id: user2Id, status: 'matched', source: 'swipe' })
            .select('id')
            .single();

          if (newMatch) {
            matched = true;
            matchId = newMatch.id;
          }
        }
      }
    }

    return NextResponse.json({ success: true, matched, matchId });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
