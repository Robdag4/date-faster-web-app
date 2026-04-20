import { NextRequest, NextResponse } from 'next/server';
import { getAdmin, getUserFromToken, unauthorized, notFound } from '@/lib/events-helpers';

async function getUserMixerEvent(admin: any, userId: string) {
  const { data } = await admin.from('speed_checkins').select('event_id, speed_events(*)').eq('user_id', userId);
  const found = (data || []).find((c: any) => c.speed_events?.event_type === 'mixer' && ['draft', 'checkin', 'active'].includes(c.speed_events?.status));
  if (found) return { event_id: found.event_id, ...found.speed_events };
  const completed = (data || []).find((c: any) => c.speed_events?.event_type === 'mixer' && c.speed_events?.status === 'completed');
  if (completed) return { event_id: completed.event_id, ...completed.speed_events };
  return null;
}

export async function GET(req: NextRequest) {
  const user = await getUserFromToken(req);
  if (!user) return unauthorized();
  const admin = getAdmin();
  const event = await getUserMixerEvent(admin, user.id);
  if (!event) return notFound('Not checked into a mixer event');

  // Get user's gender
  const { data: me } = await admin.from('users').select('gender').eq('id', user.id).single();

  // Get checkins with user info (opposite gender)
  const { data: checkins } = await admin.from('speed_checkins')
    .select('user_id, users(id, first_name, age, gender, photos, bio)')
    .eq('event_id', event.id).neq('user_id', user.id);

  const attendees = (checkins || [])
    .filter((c: any) => c.users && c.users.gender !== me?.gender)
    .map((c: any) => c.users);

  // Get my stars
  const { data: myStars } = await admin.from('mixer_stars').select('starred_id').eq('event_id', event.id).eq('starrer_id', user.id);
  const starredSet = new Set((myStars || []).map(s => s.starred_id));

  // Get who starred me
  const { data: theirStars } = await admin.from('mixer_stars').select('starrer_id').eq('event_id', event.id).eq('starred_id', user.id);
  const theyStarredMe = new Set((theirStars || []).map(s => s.starrer_id));

  const includeStatements = event.status === 'active' || event.status === 'completed';

  const result = await Promise.all(attendees.map(async (a: any) => {
    const base: any = {
      id: a.id, firstName: a.first_name, age: a.age, gender: a.gender,
      photo: a.photos?.[0] || null, bio: a.bio || null,
      liked: starredSet.has(a.id), mutual: starredSet.has(a.id) && theyStarredMe.has(a.id),
    };
    if (includeStatements) {
      const { data: stmt } = await admin.from('mixer_statements')
        .select('statement1, statement2, statement3')
        .eq('event_id', event.id).eq('user_id', a.id).maybeSingle();
      base.statements = stmt || null;
    }
    return base;
  }));

  return NextResponse.json(result);
}
