import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { v4 as uuid } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { eventCode } = await request.json();
    
    if (!eventCode) {
      return NextResponse.json({ error: 'eventCode required' }, { status: 400 });
    }

    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get user profile
    const { data: userProfile, error: userError } = await supabase
      .from('users')
      .select('id, first_name, age, gender')
      .eq('id', user.id)
      .single();

    if (userError || !userProfile) {
      return NextResponse.json({ error: 'User profile not found' }, { status: 404 });
    }

    if (!userProfile.first_name || !userProfile.age || !userProfile.gender) {
      return NextResponse.json({ 
        error: 'Profile incomplete — need name, age, and gender', 
        needsProfile: true 
      }, { status: 400 });
    }

    // Find mixer event
    const { data: event, error: eventError } = await supabase
      .from('speed_events')
      .select('*')
      .eq('event_code', eventCode)
      .eq('event_type', 'mixer')
      .in('status', ['draft', 'checkin', 'active'])
      .single();

    if (eventError || !event) {
      return NextResponse.json({ error: 'Mixer event not found or check-in closed' }, { status: 404 });
    }

    // Check if already checked in
    const { data: existingCheckin } = await supabase
      .from('speed_checkins')
      .select('id')
      .eq('event_id', event.id)
      .eq('user_id', user.id)
      .single();

    if (existingCheckin) {
      return NextResponse.json({ 
        error: 'Already checked in', 
        eventId: event.id 
      }, { status: 409 });
    }

    // Check capacity
    const { count: checkinCount } = await supabase
      .from('speed_checkins')
      .select('*', { count: 'exact' })
      .eq('event_id', event.id);

    if (checkinCount && checkinCount >= event.max_capacity) {
      return NextResponse.json({ error: 'Event is at capacity' }, { status: 400 });
    }

    // Create checkin
    const { error: checkinError } = await supabase
      .from('speed_checkins')
      .insert({
        id: uuid(),
        event_id: event.id,
        user_id: user.id,
        gender: userProfile.gender,
        seat_number: (checkinCount || 0) + 1
      });

    if (checkinError) {
      return NextResponse.json({ error: 'Checkin failed' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      eventId: event.id
    });

  } catch (error) {
    console.error('Mixer checkin error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}