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
    const { targetId, guessedIndex, mapping } = await request.json();

    if (!targetId || !guessedIndex) {
      return NextResponse.json({ 
        error: 'targetId and guessedIndex required' 
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

    // Check if already guessed for this person
    const { data: existingGuess } = await supabase
      .from('mixer_guesses')
      .select('id')
      .eq('event_id', event.id)
      .eq('guesser_id', user.id)
      .eq('target_id', targetId)
      .single();

    if (existingGuess) {
      return NextResponse.json({ 
        error: 'Already guessed for this person' 
      }, { status: 409 });
    }

    // Get the target's statements to check the lie
    const { data: targetStatements, error: statementsError } = await supabase
      .from('mixer_statements')
      .select('lie_index')
      .eq('event_id', event.id)
      .eq('user_id', targetId)
      .single();

    if (statementsError || !targetStatements) {
      return NextResponse.json({ 
        error: 'Target statements not found' 
      }, { status: 404 });
    }

    // Map shuffled index back to original using mapping
    let originalGuessedIndex = guessedIndex;
    if (mapping) {
      const mapArr = mapping.split(',').map(Number);
      originalGuessedIndex = mapArr[guessedIndex - 1];
    }

    const isCorrect = originalGuessedIndex === targetStatements.lie_index;

    // Save the guess
    const { error: insertError } = await supabase
      .from('mixer_guesses')
      .insert({
        id: uuid(),
        event_id: event.id,
        guesser_id: user.id,
        target_id: targetId,
        guessed_index: originalGuessedIndex,
        is_correct: isCorrect
      });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to save guess' }, { status: 500 });
    }

    return NextResponse.json({
      correct: isCorrect,
      lieIndex: targetStatements.lie_index
    });

  } catch (error) {
    console.error('Mixer guess error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}