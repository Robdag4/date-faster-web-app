import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, getUserFromToken, unauthorized, badRequest, notFound } from '@/lib/events-helpers';

async function getUserMixerEvent(admin: any, userId: string) {
  const { data } = await admin.from('speed_checkins').select('event_id, speed_events(*)').eq('user_id', userId);
  const found = (data || []).find((c: any) => c.speed_events?.event_type === 'mixer' && ['draft', 'checkin', 'active'].includes(c.speed_events?.status));
  if (found) return { event_id: found.event_id, ...found.speed_events };
  const completed = (data || []).find((c: any) => c.speed_events?.event_type === 'mixer' && c.speed_events?.status === 'completed');
  if (completed) return { event_id: completed.event_id, ...completed.speed_events };
  return null;
}

export async function POST(req: NextRequest) {
  const user = await getUserFromToken(req);
  if (!user) return unauthorized();
  const { targetId, guessedIndex, mapping } = await req.json();
  if (!targetId || !guessedIndex) return badRequest('targetId and guessedIndex required');

  const admin = getAdmin();
  const event = await getUserMixerEvent(admin, user.id);
  if (!event) return notFound('Not checked into a mixer event');

  const { data: existing } = await admin.from('mixer_guesses').select('id').eq('event_id', event.id).eq('guesser_id', user.id).eq('target_id', targetId).maybeSingle();
  if (existing) return NextResponse.json({ error: 'Already guessed for this person' }, { status: 409 });

  const { data: targetStmt } = await admin.from('mixer_statements').select('lie_index').eq('event_id', event.id).eq('user_id', targetId).single();
  if (!targetStmt) return notFound('Target statements not found');

  let originalGuessedIndex = guessedIndex;
  if (mapping) {
    const mapArr = mapping.split(',').map(Number);
    originalGuessedIndex = mapArr[guessedIndex - 1];
  }

  const isCorrect = originalGuessedIndex === targetStmt.lie_index;
  await admin.from('mixer_guesses').insert({
    event_id: event.id, guesser_id: user.id, target_id: targetId,
    guessed_index: originalGuessedIndex, is_correct: isCorrect
  });

  return NextResponse.json({ correct: isCorrect, lieIndex: targetStmt.lie_index });
}
