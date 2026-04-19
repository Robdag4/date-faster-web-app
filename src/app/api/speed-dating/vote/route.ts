import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { v4 as uuid } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { roundId, targetId, compatibilityRating, notes, wantsMatch } = await request.json();

    if (!roundId || !targetId || compatibilityRating === undefined || wantsMatch === undefined) {
      return NextResponse.json({ 
        error: 'roundId, targetId, compatibilityRating, and wantsMatch required' 
      }, { status: 400 });
    }

    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify round exists and is in voting/active/completed state
    const { data: round, error: roundError } = await supabase
      .from('speed_rounds')
      .select('*')
      .eq('id', roundId)
      .in('status', ['voting', 'active', 'completed'])
      .single();

    if (roundError || !round) {
      return NextResponse.json({ error: 'Round not found or not in voting state' }, { status: 404 });
    }

    // Verify this pairing exists
    const { data: pairing, error: pairingError } = await supabase
      .from('speed_pairings')
      .select('*')
      .eq('round_id', roundId)
      .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${user.id})`)
      .single();

    if (pairingError || !pairing) {
      return NextResponse.json({ error: 'Invalid pairing for this round' }, { status: 400 });
    }

    // Check if already voted
    const { data: existingVote, error: voteCheckError } = await supabase
      .from('speed_votes')
      .select('id')
      .eq('round_id', roundId)
      .eq('voter_id', user.id)
      .single();

    if (existingVote) {
      // Update existing vote
      const { error: updateError } = await supabase
        .from('speed_votes')
        .update({
          target_id: targetId,
          compatibility_rating: compatibilityRating,
          notes: notes || null,
          wants_match: wantsMatch,
          voted_at: new Date().toISOString()
        })
        .eq('round_id', roundId)
        .eq('voter_id', user.id);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 });
      }

      return NextResponse.json({ success: true, updated: true });
    }

    // Create new vote
    const { error: insertError } = await supabase
      .from('speed_votes')
      .insert({
        id: uuid(),
        round_id: roundId,
        voter_id: user.id,
        target_id: targetId,
        compatibility_rating: compatibilityRating,
        notes: notes || null,
        wants_match: wantsMatch
      });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to submit vote' }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (error) {
    console.error('Speed dating vote error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}