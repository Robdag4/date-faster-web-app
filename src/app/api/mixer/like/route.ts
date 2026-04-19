import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { v4 as uuid } from 'uuid';

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

export async function POST(request: NextRequest) {
  try {
    const { targetId } = await request.json();

    if (!targetId) {
      return NextResponse.json({ error: 'targetId required' }, { status: 400 });
    }

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

    // Check if already starred
    const { data: existing } = await supabase
      .from('mixer_stars')
      .select('id')
      .eq('event_id', event.id)
      .eq('starrer_id', user.id)
      .eq('starred_id', targetId)
      .single();

    if (!existing) {
      // Create the star
      const { error: insertError } = await supabase
        .from('mixer_stars')
        .insert({
          id: uuid(),
          event_id: event.id,
          starrer_id: user.id,
          starred_id: targetId
        });

      if (insertError) {
        return NextResponse.json({ error: 'Failed to star user' }, { status: 500 });
      }
    }

    // Check if mutual (they also starred me)
    const { data: theyStarredMe } = await supabase
      .from('mixer_stars')
      .select('id')
      .eq('event_id', event.id)
      .eq('starrer_id', targetId)
      .eq('starred_id', user.id)
      .single();

    let matchId = null;
    if (theyStarredMe) {
      // Check if match already exists
      const { data: existingMatch } = await supabase
        .from('matches')
        .select('id')
        .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${user.id})`)
        .single();

      if (!existingMatch) {
        // Create match record
        const newMatchId = uuid();
        const { error: matchError } = await supabase
          .from('matches')
          .insert({
            id: newMatchId,
            user1_id: user.id < targetId ? user.id : targetId,
            user2_id: user.id < targetId ? targetId : user.id,
            status: 'paid', // Mixer matches skip payment
            source: 'mixer'
          });

        if (!matchError) {
          matchId = newMatchId;
        }
      } else {
        matchId = existingMatch.id;
      }
    }

    return NextResponse.json({
      success: true,
      mutual: !!theyStarredMe,
      matchId
    });

  } catch (error) {
    console.error('Mixer like error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { targetId } = await request.json();

    if (!targetId) {
      return NextResponse.json({ error: 'targetId required' }, { status: 400 });
    }

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

    // Remove the star
    const { error: deleteError } = await supabase
      .from('mixer_stars')
      .delete()
      .eq('event_id', event.id)
      .eq('starrer_id', user.id)
      .eq('starred_id', targetId);

    if (deleteError) {
      return NextResponse.json({ error: 'Failed to unstar user' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Mixer unlike error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}