import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, getUserFromToken, unauthorized, notFound, badRequest } from '@/lib/events-helpers';

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
  const admin = getAdmin();
  const event = await getUserMixerEvent(admin, user.id);
  if (!event) return notFound('Not checked into a mixer event');
  if (event.status !== 'active') return badRequest('Event not active yet');

  // Find already-guessed targets
  const { data: guessed } = await admin.from('mixer_guesses').select('target_id').eq('event_id', event.id).eq('guesser_id', user.id);
  const guessedIds = (guessed || []).map(g => g.target_id);

  // Find unguessed target with statements
  let query = admin.from('mixer_statements')
    .select('*, users(first_name, age)')
    .eq('event_id', event.id)
    .neq('user_id', user.id);

  if (guessedIds.length > 0) {
    // Filter out already guessed - need to use not.in
    query = query.not('user_id', 'in', `(${guessedIds.join(',')})`);
  }

  const { data: targets } = await query;
  if (!targets || targets.length === 0) return NextResponse.json({ done: true });

  // Random pick
  const target = targets[Math.floor(Math.random() * targets.length)] as any;
  const statements = [
    { text: target.statement1, originalIndex: 1 },
    { text: target.statement2, originalIndex: 2 },
    { text: target.statement3, originalIndex: 3 },
  ];
  // Fisher-Yates shuffle
  for (let i = statements.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [statements[i], statements[j]] = [statements[j], statements[i]];
  }

  return NextResponse.json({
    done: false,
    target: {
      userId: target.user_id,
      firstName: target.users?.first_name,
      age: target.users?.age,
      statements: statements.map((s, i) => ({ index: i + 1, text: s.text })),
      _mapping: statements.map(s => s.originalIndex).join(','),
    },
  });
}
