import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { v4 as uuid } from 'uuid';

// Helper to get user's active mixer event
async function getUserMixerEvent(supabase: any, userId: string) {
  // Prioritize active/checkin/draft events over completed ones
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

  // Fallback to completed event
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
    const { statement1, statement2, statement3, lieIndex } = await request.json();

    if (!statement1 || !statement2 || !statement3 || !lieIndex) {
      return NextResponse.json({ 
        error: 'statement1, statement2, statement3, and lieIndex required' 
      }, { status: 400 });
    }

    if (lieIndex < 1 || lieIndex > 3) {
      return NextResponse.json({ 
        error: 'lieIndex must be 1, 2, or 3' 
      }, { status: 400 });
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

    // Check if statements already exist
    const { data: existing } = await supabase
      .from('mixer_statements')
      .select('id')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .single();

    if (existing) {
      // Update existing statements
      const { error: updateError } = await supabase
        .from('mixer_statements')
        .update({
          statement1,
          statement2,
          statement3,
          lie_index: lieIndex
        })
        .eq('event_id', event.id)
        .eq('user_id', user.id);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update statements' }, { status: 500 });
      }

      return NextResponse.json({ success: true, updated: true });
    }

    // Create new statements
    const { error: insertError } = await supabase
      .from('mixer_statements')
      .insert({
        id: uuid(),
        event_id: event.id,
        user_id: user.id,
        statement1,
        statement2,
        statement3,
        lie_index: lieIndex
      });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to save statements' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Mixer statements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
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
      return NextResponse.json({ statements: null });
    }

    const { data: statements } = await supabase
      .from('mixer_statements')
      .select('statement1, statement2, statement3, lie_index')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .single();

    return NextResponse.json({ 
      statements: statements || null, 
      eventId: event.id, 
      eventStatus: event.status 
    });

  } catch (error) {
    console.error('Get mixer statements error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}