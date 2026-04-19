import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';
import { v4 as uuid } from 'uuid';

export async function POST(request: NextRequest) {
  try {
    const { matchId, content } = await request.json();

    if (!matchId || !content?.trim()) {
      return NextResponse.json({ 
        error: 'matchId and content required' 
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

    // Check if chat is allowed (paid matches or event matches)
    const chatAllowed = match.status === 'paid' || 
                       match.status === 'completed' || 
                       match.source === 'mixer' ||
                       match.source === 'speed_dating';
                       
    if (!chatAllowed) {
      return NextResponse.json({ 
        error: 'Chat is locked until date payment is completed' 
      }, { status: 403 });
    }

    const messageId = uuid();

    // Insert message
    const { error: insertError } = await supabase
      .from('messages')
      .insert({
        id: messageId,
        match_id: matchId,
        sender_id: user.id,
        content: content.trim()
      });

    if (insertError) {
      return NextResponse.json({ error: 'Failed to send message' }, { status: 500 });
    }

    return NextResponse.json({
      id: messageId,
      matchId,
      senderId: user.id,
      content: content.trim()
    }, { status: 201 });

  } catch (error) {
    console.error('Chat send error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}