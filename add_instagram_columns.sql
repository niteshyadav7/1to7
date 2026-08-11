-- Add Instagram buffer columns to users table for storing all Instagram API data
-- These columns allow storing the full Instagram profile for future use

-- Instagram identity
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_access_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_instagram_verified BOOLEAN DEFAULT false;

-- Instagram profile data  
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_profile_pic TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_biography TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_website TEXT;

-- Instagram metrics
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_followers_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_follows_count INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_media_count INTEGER DEFAULT 0;

-- Instagram account metadata
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_account_type TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS instagram_ig_id TEXT;

-- Create index on instagram_id for fast lookups
CREATE INDEX IF NOT EXISTS idx_users_instagram_id ON users(instagram_id);
