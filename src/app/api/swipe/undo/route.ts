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

    const admin = getAdmin();
    const { data: { user }, error: authError } = await admin.auth.getUser(authHeader.slice(7));
    if (authError || !user) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 });
    }

    // Check premium
    const { data: profile } = await admin.from('users').select('is_premium').eq('id', user.id).single();
    if (!profile?.is_premium) {
      return NextResponse.json({ error: 'Premium feature' }, { status: 403 });
    }

    const { targetId } = await req.json();
    if (!targetId) {
      return NextResponse.json({ error: 'Missing targetId' }, { status: 400 });
    }

    // Delete the swipe
    const { error: deleteError } = await admin
      .from('swipes')
      .delete()
      .eq('swiper_id', user.id)
      .eq('swiped_id', targetId);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    // Also delete any match that was created from this swipe
    const [id1, id2] = [user.id, targetId].sort();
    await admin.from('matches').delete().eq('user1_id', id1).eq('user2_id', id2).eq('source', 'swipe');

    return NextResponse.json({ success: true });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
