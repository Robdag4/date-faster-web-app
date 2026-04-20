import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, getUserFromToken, unauthorized, badRequest } from '@/lib/events-helpers';

export async function POST(req: NextRequest) {
  const user = await getUserFromToken(req);
  if (!user) return unauthorized();
  const { roundId, targetId, compatibilityRating, notes, wantsMatch } = await req.json();
  if (!roundId || !targetId || compatibilityRating === undefined || wantsMatch === undefined)
    return badRequest('roundId, targetId, compatibilityRating, and wantsMatch required');

  const admin = getAdmin();
  const { data: round } = await admin.from('speed_rounds').select('*').eq('id', roundId).in('status', ['voting', 'active', 'completed']).maybeSingle();
  if (!round) return NextResponse.json({ error: 'Round not found or not in voting state' }, { status: 404 });

  // Verify pairing
  const { data: pairing } = await admin.from('speed_pairings').select('*').eq('round_id', roundId)
    .or(`and(user1_id.eq.${user.id},user2_id.eq.${targetId}),and(user1_id.eq.${targetId},user2_id.eq.${user.id})`)
    .maybeSingle();
  if (!pairing) return badRequest('Invalid pairing for this round');

  // Check existing vote
  const { data: existing } = await admin.from('speed_votes').select('id').eq('round_id', roundId).eq('voter_id', user.id).maybeSingle();
  if (existing) {
    await admin.from('speed_votes').update({
      target_id: targetId, compatibility_rating: compatibilityRating,
      notes: notes || null, wants_match: wantsMatch, voted_at: new Date().toISOString()
    }).eq('id', existing.id);
    return NextResponse.json({ success: true, updated: true });
  }

  await admin.from('speed_votes').insert({
    round_id: roundId, voter_id: user.id, target_id: targetId,
    compatibility_rating: compatibilityRating, notes: notes || null, wants_match: wantsMatch
  });
  return NextResponse.json({ success: true });
}
