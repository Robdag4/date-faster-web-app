import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

// Helper to get user's active mixer event
async function getUserMixerEvent(supabase: any, userId: string) {
  const { data: active } = await supabase
    .from('speed_checkins')
    .select(`
      event_id,
      speed_events (*)
    `)
    .eq('user_id', userId)
    .eq('speed_events.event_type', 'mixer')
    .in('speed_events.status', ['draft', 'checkin', 'active'])
    .order('speed_events.date', { ascending: false })
    .limit(1)
    .single();

  if (active) return { id: active.event_id, ...active.speed_events };

  const { data: completed } = await supabase
    .from('speed_checkins')
    .select(`
      event_id,
      speed_events (*)
    `)
    .eq('user_id', userId)
    .eq('speed_events.event_type', 'mixer')
    .eq('speed_events.status', 'completed')
    .order('speed_events.date', { ascending: false })
    .limit(1)
    .single();

  return completed ? { id: completed.event_id, ...completed.speed_events } : null;
}

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const event = await getUserMixerEvent(supabase, user.id);
    if (!event) {
      return NextResponse.json({ error: 'Not checked into a mixer event' }, { status: 404 });
    }

    // Get current user's gender to filter opposite gender only
    const { data: currentUser } = await supabase
      .from('users')
      .select('gender')
      .eq('id', user.id)
      .single();

    // Get all checked-in attendees (excluding self and same gender)
    const { data: checkins, error: checkinsError } = await supabase
      .from('speed_checkins')
      .select(`
        user_id,
        users (
          id,
          first_name,
          age,
          gender,
          photos,
          bio
        )
      `)
      .eq('event_id', event.id)
      .neq('user_id', user.id)
      .neq('users.gender', currentUser?.gender || '')
      .order('users.first_name');

    if (checkinsError) {
      return NextResponse.json({ error: 'Failed to fetch attendees' }, { status: 500 });
    }

    // Get my stars for these users
    const userIds = checkins.map(c => c.user_id);
    const { data: myStars } = await supabase
      .from('mixer_stars')
      .select('starred_id')
      .eq('event_id', event.id)
      .eq('starrer_id', user.id)
      .in('starred_id', userIds);

    const starredIds = new Set(myStars?.map(s => s.starred_id) || []);

    // Get mutual stars
    const { data: mutualStars } = await supabase
      .from('mixer_stars')
      .select('starrer_id, starred_id')
      .eq('event_id', event.id)
      .or(`starrer_id.eq.${user.id},starred_id.eq.${user.id}`)
      .in('starrer_id', [...userIds, user.id])
      .in('starred_id', [...userIds, user.id]);

    // Find mutual stars (both directions)
    const mutualIds = new Set();
    const myStarsSet = new Set();
    const theirStarsSet = new Set();

    mutualStars?.forEach(star => {
      if (star.starrer_id === user.id) {
        myStarsSet.add(star.starred_id);
      } else if (star.starred_id === user.id) {
        theirStarsSet.add(star.starrer_id);
      }
    });

    myStarsSet.forEach(starredId => {
      if (theirStarsSet.has(starredId)) {
        mutualIds.add(starredId);
      }
    });

    // Include statements if event is active or completed
    const includeStatements = event.status === 'active' || event.status === 'completed';

    const attendees = await Promise.all(
      checkins.map(async (checkin) => {
        const user = checkin.users;
        const base: any = {
          id: user.id,
          firstName: user.first_name,
          age: user.age,
          gender: user.gender,
          photo: user.photos && user.photos.length > 0 ? user.photos[0] : null,
          bio: user.bio || null,
          liked: starredIds.has(user.id),
          mutual: mutualIds.has(user.id),
        };

        if (includeStatements) {
          const { data: statements } = await supabase
            .from('mixer_statements')
            .select('statement1, statement2, statement3')
            .eq('event_id', event.id)
            .eq('user_id', user.id)
            .single();

          base.statements = statements || null;
        }

        return base;
      })
    );

    return NextResponse.json(attendees);

  } catch (error) {
    console.error('Mixer attendees error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}