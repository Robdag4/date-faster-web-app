import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { redemptionCode, venuePin } = await request.json();

    if (!redemptionCode || !venuePin) {
      return NextResponse.json({ 
        error: 'Redemption code and venue PIN required' 
      }, { status: 400 });
    }

    const supabase = createClient();

    // Find the date request by redemption code
    const { data: dateReq, error: reqError } = await supabase
      .from('date_requests')
      .select(`
        *,
        date_packages (
          name,
          description,
          price_cents,
          venue_id,
          venues (
            name,
            pin
          )
        ),
        users!date_requests_sender_id_fkey (
          first_name
        )
      `)
      .eq('redemption_code', redemptionCode)
      .single();

    if (reqError || !dateReq) {
      return NextResponse.json({ 
        error: 'Invalid redemption code' 
      }, { status: 404 });
    }

    // Check if already redeemed
    if (dateReq.redeemed_at) {
      return NextResponse.json({ 
        error: 'Code already redeemed',
        redeemedAt: dateReq.redeemed_at,
        redeemedBy: dateReq.redeemed_by
      }, { status: 409 });
    }

    // Verify venue PIN
    const venue = dateReq.date_packages?.venues;
    if (!venue || venue.pin !== venuePin) {
      return NextResponse.json({ 
        error: 'Invalid venue PIN' 
      }, { status: 403 });
    }

    // Get both users in the match
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(`
        user1_id,
        user2_id,
        users!matches_user1_id_fkey (
          first_name
        ),
        users_matches_user2_id_fkey:users!matches_user2_id_fkey (
          first_name
        )
      `)
      .eq('id', dateReq.match_id)
      .single();

    if (matchError || !match) {
      return NextResponse.json({ 
        error: 'Match not found' 
      }, { status: 404 });
    }

    // Mark as redeemed
    const { error: redeemError } = await supabase
      .from('date_requests')
      .update({
        redeemed_at: new Date().toISOString(),
        redeemed_by: venue.name || 'Venue Staff'
      })
      .eq('id', dateReq.id);

    if (redeemError) {
      return NextResponse.json({ 
        error: 'Failed to redeem code' 
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      package: {
        name: dateReq.date_packages?.name,
        description: dateReq.date_packages?.description,
        priceFormatted: `$${((dateReq.date_packages?.price_cents || 0) / 100).toFixed(2)}`
      },
      participants: {
        user1: match.users?.first_name,
        user2: match.users_matches_user2_id_fkey?.first_name
      },
      scheduledDate: dateReq.scheduled_date,
      scheduledTime: dateReq.scheduled_time,
      redeemedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('QR redemption error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}