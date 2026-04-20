import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase';

const ADMIN_TOKEN = process.env.ADMIN_TOKEN || '';

function checkAuth(req: NextRequest) {
  const header = req.headers.get('authorization');
  if (!header?.startsWith('Bearer ') || header.slice(7) !== ADMIN_TOKEN) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  return null;
}

export async function GET(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const status = req.nextUrl.searchParams.get('status') || 'pending';

  const { data: photos } = await supabase
    .from('photo_reviews')
    .select('id, user_id, photo_url, status, created_at')
    .eq('status', status)
    .order('created_at', { ascending: false })
    .limit(100);

  if (!photos) return NextResponse.json([]);

  // Attach user names
  const userIds = [...new Set(photos.map(p => p.user_id))];
  const { data: users } = await supabase.from('users').select('id, first_name').in('id', userIds);
  const nameMap: Record<string, string> = {};
  (users || []).forEach(u => { nameMap[u.id] = u.first_name; });

  return NextResponse.json(photos.map(p => ({ ...p, user_name: nameMap[p.user_id] || 'Unknown' })));
}

export async function PATCH(req: NextRequest) {
  const authErr = checkAuth(req);
  if (authErr) return authErr;

  const supabase = createAdminClient();
  const { id, action } = await req.json();

  if (!id || !action) return NextResponse.json({ error: 'id and action required' }, { status: 400 });

  if (action === 'approve') {
    await supabase.from('photo_reviews').update({ status: 'approved' }).eq('id', id);
  } else if (action === 'flag') {
    await supabase.from('photo_reviews').update({ status: 'flagged' }).eq('id', id);
    // Also flag the user
    const { data: review } = await supabase.from('photo_reviews').select('user_id').eq('id', id).single();
    if (review) {
      await supabase.from('users').update({ photo_flagged: true }).eq('id', review.user_id);
    }
  } else if (action === 'remove') {
    // Get the photo URL, remove from user's photos array, delete review
    const { data: review } = await supabase.from('photo_reviews').select('user_id, photo_url').eq('id', id).single();
    if (review) {
      const { data: user } = await supabase.from('users').select('photos').eq('id', review.user_id).single();
      if (user?.photos) {
        const updated = user.photos.filter((p: string) => p !== review.photo_url);
        await supabase.from('users').update({ photos: updated }).eq('id', review.user_id);
      }
    }
    await supabase.from('photo_reviews').delete().eq('id', id);
  }

  return NextResponse.json({ success: true });
}
