import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const { requestId, action, counterPackageId, scheduled_date, scheduled_time, note } = await request.json();

    if (!requestId || !action) {
      return NextResponse.json({ 
        error: 'requestId and action required' 
      }, { status: 400 });
    }

    const supabase = createClient();

    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get date request
    const { data: dateReq, error: reqError } = await supabase
      .from('date_requests')
      .select('*')
      .eq('id', requestId)
      .single();

    if (reqError || !dateReq) {
      return NextResponse.json({ error: 'Date request not found' }, { status: 404 });
    }

    const isPending = dateReq.status === 'pending' && dateReq.receiver_id === user.id;
    const isCountered = dateReq.status === 'countered' && dateReq.sender_id === user.id;

    if (!isPending && !isCountered) {
      return NextResponse.json({ 
        error: 'Cannot respond to this request' 
      }, { status: 400 });
    }

    if (action === 'accept') {
      // Accept the request
      const { error: updateError } = await supabase
        .from('date_requests')
        .update({ 
          status: 'accepted',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to accept request' }, { status: 500 });
      }

      // Update match status
      const { error: matchUpdateError } = await supabase
        .from('matches')
        .update({ status: 'date_accepted' })
        .eq('id', dateReq.match_id);

      if (matchUpdateError) {
        console.error('Failed to update match status:', matchUpdateError);
      }

      return NextResponse.json({ success: true, status: 'accepted' });

    } else if (action === 'counter' && counterPackageId) {
      // Counter with different package
      const { data: counterPkg, error: pkgError } = await supabase
        .from('date_packages')
        .select('*')
        .eq('id', counterPackageId)
        .eq('active', true)
        .single();

      if (pkgError || !counterPkg) {
        return NextResponse.json({ error: 'Counter package not found' }, { status: 404 });
      }

      const updates: any = {
        status: 'countered',
        counter_package_id: counterPackageId,
        updated_at: new Date().toISOString()
      };

      if (scheduled_date) updates.scheduled_date = scheduled_date;
      if (scheduled_time) updates.scheduled_time = scheduled_time;
      if (note !== undefined) updates.note = note;

      const { error: updateError } = await supabase
        .from('date_requests')
        .update(updates)
        .eq('id', requestId);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to counter request' }, { status: 500 });
      }

      return NextResponse.json({ 
        success: true, 
        status: 'countered', 
        counterPackageId 
      });

    } else if (action === 'decline') {
      // Decline the request
      const { error: updateError } = await supabase
        .from('date_requests')
        .update({ 
          status: 'declined',
          updated_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) {
        return NextResponse.json({ error: 'Failed to decline request' }, { status: 500 });
      }

      // Reset match status back to matched
      const { error: matchUpdateError } = await supabase
        .from('matches')
        .update({ status: 'matched' })
        .eq('id', dateReq.match_id);

      if (matchUpdateError) {
        console.error('Failed to update match status:', matchUpdateError);
      }

      return NextResponse.json({ success: true, status: 'declined' });

    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

  } catch (error) {
    console.error('Date respond error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}