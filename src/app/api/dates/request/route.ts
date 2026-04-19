import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { v4 as uuid } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { matchId, packageId, note, scheduled_date, scheduled_time } = await request.json();

    if (!matchId || !packageId) {
      return NextResponse.json({ 
        error: 'matchId and packageId required' 
      }, { status: 400 });
    }

    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify match exists and user is part of it
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select('*')
      .eq('id', matchId)
      .or(`user1_id.eq.${user.id},user2_id.eq.${user.id}`)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ error: 'Match not found' }, { status: 404 });
    }

    if (match.status !== 'matched') {
      return NextResponse.json({ 
        error: 'Date already in progress for this match' 
      }, { status: 400 });
    }

    const receiverId = match.user1_id === user.id ? match.user2_id : match.user1_id;

    // Gender check: in male-female matches, only the male can propose.
    // In same-gender matches, either user can propose.
    const { data: sender } = await supabase
      .from('users')
      .select('gender')
      .eq('id', user.id)
      .single();

    const { data: receiver } = await supabase
      .from('users')
      .select('gender')
      .eq('id', receiverId)
      .single();

    const isMixedGender = sender?.gender !== receiver?.gender;
    if (isMixedGender && sender?.gender !== 'male') {
      return NextResponse.json({ 
        error: 'Only the male user can propose a date in mixed-gender matches' 
      }, { status: 403 });
    }

    // Verify package exists and is active
    const { data: pkg, error: pkgError } = await supabase
      .from('date_packages')
      .select('*')
      .eq('id', packageId)
      .eq('active', true)
      .single();

    if (pkgError || !pkg) {
      return NextResponse.json({ error: 'Package not found' }, { status: 404 });
    }

    const requestId = uuid();

    // Create date request
    const { error: insertError } = await supabase
      .from('date_requests')
      .insert({
        id: requestId,
        match_id: matchId,
        sender_id: user.id,
        receiver_id: receiverId,
        package_id: packageId,
        note: note || '',
        scheduled_date: scheduled_date || null,
        scheduled_time: scheduled_time || null
      });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to create date request' }, { status: 500 });
    }

    // Update match status
    const { error: matchUpdateError } = await supabase
      .from('matches')
      .update({ status: 'date_pending' })
      .eq('id', matchId);

    if (matchUpdateError) {
      console.error('Failed to update match status:', matchUpdateError);
    }

    return NextResponse.json({
      id: requestId,
      matchId,
      packageId,
      note: note || '',
      status: 'pending',
      scheduled_date,
      scheduled_time
    }, { status: 201 });

  } catch (error) {
    console.error('Date request error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}