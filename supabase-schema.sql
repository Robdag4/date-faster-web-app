-- DateFaster Supabase Database Schema
-- Run this in your Supabase SQL editor to set up all tables

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Create users table
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    phone_number TEXT UNIQUE,
    first_name TEXT NOT NULL DEFAULT '',
    age INTEGER DEFAULT 0,
    date_of_birth DATE,
    gender TEXT DEFAULT '',
    preference TEXT DEFAULT 'both',
    sexuality TEXT DEFAULT '',
    bio TEXT DEFAULT '',
    job_title TEXT DEFAULT '',
    tagline TEXT DEFAULT '',
    interests TEXT[] DEFAULT '{}',
    ideal_date TEXT DEFAULT '',
    relationship_goal TEXT DEFAULT '',
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    custom_latitude DOUBLE PRECISION,
    custom_longitude DOUBLE PRECISION,
    photos TEXT[] DEFAULT '{}',
    onboarding_complete BOOLEAN DEFAULT FALSE,
    is_premium BOOLEAN DEFAULT FALSE,
    incognito BOOLEAN DEFAULT FALSE,
    incognito_plus BOOLEAN DEFAULT FALSE,
    discovery_radius INTEGER DEFAULT 25,
    age_min INTEGER DEFAULT 18,
    age_max INTEGER DEFAULT 99,
    credits_balance INTEGER DEFAULT 0,
    locked BOOLEAN DEFAULT FALSE,
    locked_reason TEXT,
    locked_at TIMESTAMPTZ,
    stripe_customer_id TEXT,
    stripe_subscription_id TEXT,
    premium_cancel_at TIMESTAMPTZ,
    last_ip TEXT,
    last_device_fingerprint TEXT,
    last_login_at TIMESTAMPTZ,
    deleted_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create swipes table
CREATE TABLE IF NOT EXISTS swipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    swiper_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    swiped_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    direction TEXT NOT NULL CHECK(direction IN ('like', 'pass')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(swiper_id, swiped_id)
);

-- Create matches table
CREATE TABLE IF NOT EXISTS matches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    status TEXT DEFAULT 'matched' CHECK(status IN ('matched', 'date_pending', 'date_accepted', 'paid', 'completed', 'unmatched')),
    source TEXT DEFAULT 'swipe' CHECK(source IN ('swipe', 'speed_dating', 'mixer')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CHECK(user1_id < user2_id) -- Ensure consistent ordering
);

-- Create venues table
CREATE TABLE IF NOT EXISTS venues (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    address TEXT,
    phone TEXT,
    email TEXT,
    contact_name TEXT,
    latitude DOUBLE PRECISION,
    longitude DOUBLE PRECISION,
    pin TEXT,
    payout_method TEXT DEFAULT 'manual',
    payout_details TEXT,
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create date_packages table
CREATE TABLE IF NOT EXISTS date_packages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    price_cents INTEGER NOT NULL,
    category TEXT NOT NULL,
    image_url TEXT DEFAULT '',
    venue_id UUID REFERENCES venues(id),
    active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create date_requests table
CREATE TABLE IF NOT EXISTS date_requests (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES date_packages(id),
    note TEXT DEFAULT '',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'accepted', 'countered', 'declined')),
    counter_package_id UUID REFERENCES date_packages(id),
    scheduled_date DATE,
    scheduled_time TIME,
    redemption_code TEXT UNIQUE,
    redeemed_at TIMESTAMPTZ,
    redeemed_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create payments table
CREATE TABLE IF NOT EXISTS payments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    date_request_id UUID NOT NULL REFERENCES date_requests(id) ON DELETE CASCADE,
    payer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL,
    stripe_session_id TEXT,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'completed', 'refunded')),
    payout_status TEXT DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create messages table
CREATE TABLE IF NOT EXISTS messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create reports table
CREATE TABLE IF NOT EXISTS reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reported_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    match_id UUID REFERENCES matches(id) ON DELETE CASCADE,
    reason TEXT NOT NULL CHECK(reason IN ('inappropriate_photos', 'harassment', 'fake_profile', 'spam', 'underage', 'other')),
    details TEXT DEFAULT '',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'warned', 'banned', 'dismissed')),
    admin_note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create blocks table
CREATE TABLE IF NOT EXISTS blocks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    blocker_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    blocked_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(blocker_id, blocked_id)
);

-- Create date_credits table
CREATE TABLE IF NOT EXISTS date_credits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    package_id UUID NOT NULL REFERENCES date_packages(id),
    original_match_id UUID REFERENCES matches(id),
    original_payment_id UUID REFERENCES payments(id),
    assigned_match_id UUID REFERENCES matches(id),
    status TEXT DEFAULT 'available' CHECK(status IN ('available', 'assigned', 'used', 'expired')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create verifications table
CREATE TABLE IF NOT EXISTS verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    photo_url TEXT DEFAULT '',
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'denied')),
    admin_note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create credits_history table
CREATE TABLE IF NOT EXISTS credits_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    amount_cents INTEGER NOT NULL,
    reason TEXT NOT NULL,
    admin_note TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create login_history table
CREATE TABLE IF NOT EXISTS login_history (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    ip_address TEXT,
    user_agent TEXT,
    device_fingerprint TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create speed_events table (for both speed dating and mixer events)
CREATE TABLE IF NOT EXISTS speed_events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    event_code TEXT UNIQUE NOT NULL,
    city TEXT NOT NULL,
    venue_name TEXT,
    venue_address TEXT,
    date TEXT NOT NULL,
    status TEXT DEFAULT 'draft' CHECK(status IN ('draft', 'checkin', 'active', 'completed')),
    event_type TEXT DEFAULT 'speed_dating' CHECK(event_type IN ('speed_dating', 'mixer')),
    max_capacity INTEGER DEFAULT 50,
    round_duration_seconds INTEGER DEFAULT 300,
    host_username TEXT,
    host_pin TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    started_at TIMESTAMPTZ,
    completed_at TIMESTAMPTZ
);

-- Create speed_checkins table
CREATE TABLE IF NOT EXISTS speed_checkins (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES speed_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    gender TEXT NOT NULL,
    seat_number INTEGER,
    is_late_arrival BOOLEAN DEFAULT FALSE,
    checked_in_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Create speed_rounds table
CREATE TABLE IF NOT EXISTS speed_rounds (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES speed_events(id) ON DELETE CASCADE,
    round_number INTEGER NOT NULL,
    status TEXT DEFAULT 'pending' CHECK(status IN ('pending', 'active', 'voting', 'completed')),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ
);

-- Create speed_icebreakers table
CREATE TABLE IF NOT EXISTS speed_icebreakers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL
);

-- Create speed_pairings table
CREATE TABLE IF NOT EXISTS speed_pairings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id UUID NOT NULL REFERENCES speed_rounds(id) ON DELETE CASCADE,
    event_id UUID NOT NULL REFERENCES speed_events(id) ON DELETE CASCADE,
    user1_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    user2_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    table_number INTEGER,
    icebreaker_id UUID REFERENCES speed_icebreakers(id)
);

-- Create speed_votes table
CREATE TABLE IF NOT EXISTS speed_votes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    round_id UUID NOT NULL REFERENCES speed_rounds(id) ON DELETE CASCADE,
    voter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    compatibility_rating INTEGER CHECK(compatibility_rating BETWEEN 1 AND 5),
    notes TEXT,
    wants_match BOOLEAN DEFAULT FALSE,
    voted_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create mixer_statements table
CREATE TABLE IF NOT EXISTS mixer_statements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES speed_events(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    statement1 TEXT NOT NULL,
    statement2 TEXT NOT NULL,
    statement3 TEXT NOT NULL,
    lie_index INTEGER NOT NULL CHECK(lie_index BETWEEN 1 AND 3),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id)
);

-- Create mixer_guesses table
CREATE TABLE IF NOT EXISTS mixer_guesses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES speed_events(id) ON DELETE CASCADE,
    guesser_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    target_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    guessed_index INTEGER NOT NULL CHECK(guessed_index BETWEEN 1 AND 3),
    is_correct BOOLEAN NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, guesser_id, target_id)
);

-- Create mixer_stars table
CREATE TABLE IF NOT EXISTS mixer_stars (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID NOT NULL REFERENCES speed_events(id) ON DELETE CASCADE,
    starrer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    starred_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, starrer_id, starred_id)
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_phone ON users(phone_number) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_users_location ON users(latitude, longitude) WHERE onboarding_complete = TRUE AND deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_swipes_swiper ON swipes(swiper_id);
CREATE INDEX IF NOT EXISTS idx_swipes_swiped ON swipes(swiped_id);
CREATE INDEX IF NOT EXISTS idx_matches_users ON matches(user1_id, user2_id);
CREATE INDEX IF NOT EXISTS idx_messages_match ON messages(match_id, created_at);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_blocks_blocker ON blocks(blocker_id);
CREATE INDEX IF NOT EXISTS idx_date_credits_owner ON date_credits(owner_id);
CREATE INDEX IF NOT EXISTS idx_verifications_status ON verifications(status);
CREATE INDEX IF NOT EXISTS idx_credits_history_user ON credits_history(user_id);
CREATE INDEX IF NOT EXISTS idx_login_history_user ON login_history(user_id);
CREATE INDEX IF NOT EXISTS idx_speed_checkins_event ON speed_checkins(event_id);
CREATE INDEX IF NOT EXISTS idx_speed_rounds_event ON speed_rounds(event_id);
CREATE INDEX IF NOT EXISTS idx_speed_pairings_round ON speed_pairings(round_id);
CREATE INDEX IF NOT EXISTS idx_speed_pairings_event ON speed_pairings(event_id);
CREATE INDEX IF NOT EXISTS idx_speed_votes_round ON speed_votes(round_id);
CREATE INDEX IF NOT EXISTS idx_speed_votes_voter ON speed_votes(voter_id);
CREATE INDEX IF NOT EXISTS idx_mixer_statements_event ON mixer_statements(event_id);
CREATE INDEX IF NOT EXISTS idx_mixer_guesses_event ON mixer_guesses(event_id);
CREATE INDEX IF NOT EXISTS idx_mixer_guesses_guesser ON mixer_guesses(guesser_id);
CREATE INDEX IF NOT EXISTS idx_mixer_stars_event ON mixer_stars(event_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_date_requests_updated_at BEFORE UPDATE ON date_requests FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_date_credits_updated_at BEFORE UPDATE ON date_credits FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_verifications_updated_at BEFORE UPDATE ON verifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Insert sample icebreaker questions
INSERT INTO speed_icebreakers (question) VALUES
    ('What''s the most spontaneous thing you''ve ever done?'),
    ('If you could have dinner with anyone, living or dead, who would it be?'),
    ('What''s your idea of a perfect weekend?'),
    ('What''s a skill you''d love to learn?'),
    ('What''s the best trip you''ve ever taken?'),
    ('If you won the lottery tomorrow, what''s the first thing you''d do?'),
    ('What''s your go-to comfort food?'),
    ('What''s a movie you could watch over and over?'),
    ('What''s the most interesting thing you''ve read or watched recently?'),
    ('If you could live anywhere in the world, where would it be?'),
    ('What''s something on your bucket list?'),
    ('What''s your favorite way to spend a lazy Sunday?'),
    ('What''s a fun fact about you that most people don''t know?'),
    ('If you could have any superpower, what would it be?'),
    ('What''s the best advice you''ve ever received?'),
    ('What''s your favorite thing about your job?'),
    ('What kind of music do you listen to?'),
    ('Are you a morning person or a night owl?'),
    ('What''s the last thing that made you laugh really hard?'),
    ('If you could master any cuisine, which would it be?'),
    ('What''s your love language?'),
    ('What''s a deal-breaker for you in a relationship?'),
    ('Do you prefer adventures or relaxing vacations?'),
    ('What''s your guilty pleasure TV show?'),
    ('If you could relive one day of your life, which would it be?'),
    ('What''s the most romantic thing someone has done for you?'),
    ('What are you most passionate about right now?'),
    ('What''s a hobby you picked up recently?'),
    ('If your life was a movie, what genre would it be?'),
    ('What does your ideal first date look like?'),
    ('What''s something you''re proud of accomplishing?'),
    ('Do you believe in love at first sight?'),
    ('What''s your favorite season and why?'),
    ('If you could switch lives with someone for a day, who would it be?'),
    ('What makes you feel most alive?')
ON CONFLICT (question) DO NOTHING;

-- Enable Row Level Security (RLS) on sensitive tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE swipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE date_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE blocks ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies (you can customize these based on your auth setup)
-- Users can read their own data
CREATE POLICY "Users can read own data" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own data" ON users FOR UPDATE USING (auth.uid() = id);

-- Users can see matches they're part of
CREATE POLICY "Users can see their matches" ON matches FOR SELECT USING (
    auth.uid() = user1_id OR auth.uid() = user2_id
);

-- Users can see messages in their matches
CREATE POLICY "Users can see messages in their matches" ON messages FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM matches 
        WHERE matches.id = messages.match_id 
        AND (matches.user1_id = auth.uid() OR matches.user2_id = auth.uid())
    )
);

-- Enable realtime for messages (chat)
ALTER PUBLICATION supabase_realtime ADD TABLE messages;