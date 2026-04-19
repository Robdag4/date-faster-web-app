import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

interface RouteContext {
  params: {
    matchId: string;
  };
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { matchId } = context.params;
    const url = new URL(request.url);
    const after = url.searchParams.get('after');

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

    // Check if chat is allowed
    const chatAllowed = match.status === 'paid' || 
                       match.status === 'completed' || 
                       match.source === 'mixer' ||
                       match.source === 'speed_dating';
                       
    if (!chatAllowed) {
      return NextResponse.json({ 
        error: 'Chat is locked until date payment is completed' 
      }, { status: 403 });
    }

    // Build query for messages
    let query = supabase
      .from('messages')
      .select('*')
      .eq('match_id', matchId)
      .order('created_at', { ascending: true })
      .limit(100);

    if (after) {
      query = query.gt('created_at', after);
    }

    const { data: messages, error: messagesError } = await query;

    if (messagesError) {
      return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
    }

    return NextResponse.json(messages);

  } catch (error) {
    console.error('Chat messages error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}