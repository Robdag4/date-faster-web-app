-- Photo moderation system
CREATE TABLE IF NOT EXISTS photo_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id),
  photo_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'flagged')),
  reviewed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_photo_reviews_status ON photo_reviews(status);
CREATE INDEX IF NOT EXISTS idx_photo_reviews_user ON photo_reviews(user_id);

-- Add photo_flagged column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo_flagged BOOLEAN DEFAULT FALSE;

-- RLS: service role only (admin operations)
ALTER TABLE photo_reviews ENABLE ROW LEVEL SECURITY;
