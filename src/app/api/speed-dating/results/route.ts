import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Find user's most recent completed event
    const { data: checkinData, error: checkinError } = await supabase
      .from('speed_checkins')
      .select(`
        event_id,
        speed_events (
          completed_at
        )
      `)
      .eq('user_id', user.id)
      .eq('speed_events.status', 'completed')
      .eq('speed_events.event_type', 'speed_dating')
      .order('speed_events.date', { ascending: false })
      .limit(1)
      .single();

    if (checkinError || !checkinData) {
      return NextResponse.json({ matches: [], completed: false });
    }

    const eventId = checkinData.event_id;
    const completedAt = checkinData.speed_events.completed_at;

    // Check if results are still locked (1 hour after completion)
    if (completedAt) {
      const completedMs = new Date(completedAt).getTime();
      const unlockMs = completedMs + 3600000; // 1 hour
      
      if (Date.now() < unlockMs) {
        const remainingMs = unlockMs - Date.now();
        const remainingMin = Math.ceil(remainingMs / 60000);
        
        return NextResponse.json({
          matches: [],
          completed: true,
          locked: true,
          resultsAvailableAt: new Date(unlockMs).toISOString(),
          remainingMinutes: remainingMin
        });
      }
    }

    // Find mutual matches from this event
    // First get all rounds for this event
    const { data: rounds, error: roundsError } = await supabase
      .from('speed_rounds')
      .select('id')
      .eq('event_id', eventId);

    if (roundsError || !rounds) {
      return NextResponse.json({ matches: [], completed: true });
    }

    const roundIds = rounds.map(r => r.id);

    // Find mutual votes where both users wanted to match
    const { data: myVotes, error: myVotesError } = await supabase
      .from('speed_votes')
      .select('target_id, round_id')
      .eq('voter_id', user.id)
      .eq('wants_match', true)
      .in('round_id', roundIds);

    if (myVotesError) {
      return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
    }

    const matches = [];

    for (const vote of myVotes) {
      // Check if they also voted for me
      const { data: theirVote, error: theirVoteError } = await supabase
        .from('speed_votes')
        .select('id')
        .eq('voter_id', vote.target_id)
        .eq('target_id', user.id)
        .eq('wants_match', true)
        .in('round_id', roundIds)
        .single();

      if (!theirVoteError && theirVote) {
        // Mutual match found, get user details
        const { data: otherUser, error: userError } = await supabase
          .from('users')
          .select('id, first_name, age, photos')
          .eq('id', vote.target_id)
          .single();

        if (!userError && otherUser) {
          // Check if match record already exists
          const { data: matchRecord, error: matchError } = await supabase
            .from('matches')
            .select('id')
            .or(`and(user1_id.eq.${user.id},user2_id.eq.${vote.target_id}),and(user1_id.eq.${vote.target_id},user2_id.eq.${user.id})`)
            .single();

          matches.push({
            userId: otherUser.id,
            firstName: otherUser.first_name,
            age: otherUser.age,
            photos: otherUser.photos || [],
            matchId: matchRecord?.id || null,
          });
        }
      }
    }

    return NextResponse.json({
      matches,
      completed: true
    });

  } catch (error) {
    console.error('Speed dating results error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}