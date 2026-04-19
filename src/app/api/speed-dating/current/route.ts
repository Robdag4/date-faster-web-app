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

    // Find user's active event
    const { data: checkinData, error: checkinError } = await supabase
      .from('speed_checkins')
      .select(`
        *,
        speed_events (
          name,
          status,
          round_duration_seconds,
          venue_name,
          city,
          date
        )
      `)
      .eq('user_id', user.id)
      .in('speed_events.status', ['checkin', 'active', 'completed'])
      .eq('speed_events.event_type', 'speed_dating')
      .order('speed_events.date', { ascending: false })
      .limit(1)
      .single();

    if (checkinError || !checkinData) {
      return NextResponse.json({ active: false });
    }

    const eventId = checkinData.event_id;
    const event = checkinData.speed_events;

    // Get all rounds
    const { data: rounds, error: roundsError } = await supabase
      .from('speed_rounds')
      .select('*')
      .eq('event_id', eventId)
      .order('round_number');

    if (roundsError) {
      return NextResponse.json({ error: 'Failed to fetch rounds' }, { status: 500 });
    }

    // Get user's pairings with partner info
    const { data: pairings, error: pairingsError } = await supabase
      .from('speed_pairings')
      .select(`
        *,
        speed_rounds (
          round_number,
          status,
          started_at
        ),
        speed_icebreakers (
          question
        )
      `)
      .eq('event_id', eventId)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .order('speed_rounds.round_number');

    if (pairingsError) {
      return NextResponse.json({ error: 'Failed to fetch pairings' }, { status: 500 });
    }

    // Get partner names and ages for each pairing
    const pairingsWithPartners = await Promise.all(
      pairings.map(async (p) => {
        const partnerId = p.user1_id === user.id ? p.user2_id : p.user1_id;
        
        const { data: partner } = await supabase
          .from('users')
          .select('first_name, age')
          .eq('id', partnerId)
          .single();

        return {
          ...p,
          partnerId,
          partnerName: partner?.first_name || 'Unknown',
          partnerAge: partner?.age,
          round_number: p.speed_rounds?.round_number,
          round_status: p.speed_rounds?.status,
          started_at: p.speed_rounds?.started_at,
          icebreaker: p.speed_icebreakers?.question
        };
      })
    );

    // Get voting status for each round
    const { data: votes, error: votesError } = await supabase
      .from('speed_votes')
      .select('round_id')
      .eq('voter_id', user.id)
      .in('round_id', rounds.map(r => r.id));

    if (votesError) {
      return NextResponse.json({ error: 'Failed to fetch votes' }, { status: 500 });
    }

    const votedRoundIds = new Set(votes.map(v => v.round_id));

    // Find current rounds
    const activeRound = rounds.find(r => r.status === 'active') || null;
    const votingRound = rounds.find(r => r.status === 'voting') || null;

    // Get user's current pairing if there's an active round
    let currentPairing = null;
    if (activeRound) {
      currentPairing = pairingsWithPartners.find(p => p.round_id === activeRound.id) || null;
    }

    // Find next participating round
    let nextParticipatingRound = null;
    if (activeRound && !currentPairing) {
      const future = pairingsWithPartners.find(p => p.round_number > activeRound.round_number);
      nextParticipatingRound = future?.round_number || null;
    }

    // Check if user has met everyone
    const { count: oppositeCount } = await supabase
      .from('speed_checkins')
      .select('*', { count: 'exact' })
      .eq('event_id', eventId)
      .neq('gender', checkinData.gender);

    const uniquePartners = new Set(pairingsWithPartners.map(p => p.partnerId));
    const metEveryone = uniquePartners.size >= (oppositeCount || 0);

    return NextResponse.json({
      active: true,
      event: {
        id: eventId,
        name: event.name,
        status: event.status,
        roundDurationSeconds: event.round_duration_seconds,
        venueName: event.venue_name,
        city: event.city,
        date: event.date,
      },
      rounds: rounds.map(r => ({ 
        ...r, 
        voted: votedRoundIds.has(r.id) 
      })),
      pairings: pairingsWithPartners,
      currentRound: activeRound,
      votingRound: votingRound,
      currentPairing,
      nextParticipatingRound,
      isBye: activeRound ? !currentPairing : false,
      metEveryone,
      metCount: uniquePartners.size,
      totalOpposites: oppositeCount || 0,
    });

  } catch (error) {
    console.error('Get current speed dating event error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}