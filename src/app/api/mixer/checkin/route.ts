import { NextRequest, NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/lib/supabase';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { v4 as uuid } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { eventCode } = await request.json();
    
    if (!eventCode) {
      return NextResponse.json({ error: 'eventCode required' }, { status: 400 });
    }

    // Create client with auth token from request
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.replace('Bearer ', '');
    
    let userId: string | null = null;
    
    if (token) {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://fptwvsylvhzfunpspkej.supabase.co';
      const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZwdHd2c3lsdmh6ZnVucHNwa2VqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2MTkwOTEsImV4cCI6MjA5MjE5NTA5MX0.zSldAWcMe6a2LlALD2Ty4XDLU44C-jvHqw3h2f_EeC4';
      const authClient = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
        auth: { autoRefreshToken: false, persistSession: false },
        global: { headers: { Authorization: `Bearer ${token}` } },
      });
      const { data: { user } } = await authClient.auth.getUser(token);
      userId = user?.id || null;
    }
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = { id: userId };
    const supabase = createAdminClient();

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