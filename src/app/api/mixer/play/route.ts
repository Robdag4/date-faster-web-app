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

export async function POST(request: NextRequest) {
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

    if (event.status !== 'active') {
      return NextResponse.json({ 
        error: 'Event not active yet', 
        eventStatus: event.status 
      }, { status: 400 });
    }

    // Get existing guesses to exclude already guessed targets
    const { data: existingGuesses } = await supabase
      .from('mixer_guesses')
      .select('target_id')
      .eq('event_id', event.id)
      .eq('guesser_id', user.id);

    const guessedIds = existingGuesses?.map(g => g.target_id) || [];

    // Find someone with statements that I haven't guessed yet
    let query = supabase
      .from('mixer_statements')
      .select(`
        *,
        users (
          first_name,
          age
        )
      `)
      .eq('event_id', event.id)
      .neq('user_id', user.id);

    if (guessedIds.length > 0) {
      query = query.not('user_id', 'in', `(${guessedIds.join(',')})`);
    }

    const { data: targets, error: targetsError } = await query;

    if (targetsError) {
      return NextResponse.json({ error: 'Failed to fetch targets' }, { status: 500 });
    }

    if (!targets || targets.length === 0) {
      return NextResponse.json({ done: true });
    }

    // Pick a random target
    const target = targets[Math.floor(Math.random() * targets.length)];

    // Shuffle statements
    const statements = [
      { text: target.statement1, originalIndex: 1 },
      { text: target.statement2, originalIndex: 2 },
      { text: target.statement3, originalIndex: 3 },
    ];

    // Fisher-Yates shuffle
    for (let i = statements.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [statements[i], statements[j]] = [statements[j], statements[i]];
    }

    return NextResponse.json({
      done: false,
      target: {
        userId: target.user_id,
        firstName: target.users?.first_name || 'Unknown',
        age: target.users?.age,
        statements: statements.map((s, i) => ({ 
          index: i + 1, 
          text: s.text 
        })),
        // Server-side mapping for converting shuffled index back to original
        _mapping: statements.map(s => s.originalIndex).join(','),
      },
    });

  } catch (error) {
    console.error('Mixer play error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}