-- Migration: Add user_instagram_profiles table and instagram_profiles JSONB to users

-- 1. Add instagram_profiles column to public.users if not exists
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS instagram_profiles JSONB DEFAULT '[]'::jsonb;

-- 2. Create public.user_instagram_profiles table
CREATE TABLE IF NOT EXISTS public.user_instagram_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  username TEXT NOT NULL,
  normalized_username TEXT NOT NULL,
  followers INTEGER DEFAULT 0,
  category TEXT,
  profile_pic TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Create Unique Index on lower(trim(normalized_username)) to strictly enforce 1 profile = 1 account globally
CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_normalized_instagram_username 
ON public.user_instagram_profiles (lower(trim(normalized_username)));

-- 4. Create Index on user_id for fast retrieval
CREATE INDEX IF NOT EXISTS idx_user_instagram_profiles_user_id 
ON public.user_instagram_profiles (user_id);

-- 5. Backfill existing instagram handles from public.users into user_instagram_profiles
-- Clean usernames by removing @ and trimming
DO $$
DECLARE
  u RECORD;
  clean_handle TEXT;
  norm_handle TEXT;
  existing_count INT;
BEGIN
  FOR u IN 
    SELECT id, instagram_username, followers, category, instagram_profile_pic 
    FROM public.users 
    WHERE instagram_username IS NOT NULL AND trim(instagram_username) != ''
  LOOP
    clean_handle := trim(both '@' from trim(u.instagram_username));
    clean_handle := split_part(clean_handle, '?', 1);
    clean_handle := regexp_replace(clean_handle, '^https?:\/\/(www\.)?(m\.)?instagram\.com\/', '', 'i');
    clean_handle := trim(both '/' from trim(both '@' from trim(clean_handle)));
    norm_handle := lower(clean_handle);

    IF norm_handle != '' THEN
      -- Check if this normalized handle is already in user_instagram_profiles
      SELECT count(*) INTO existing_count FROM public.user_instagram_profiles WHERE normalized_username = norm_handle;
      
      IF existing_count = 0 THEN
        INSERT INTO public.user_instagram_profiles (
          user_id, username, normalized_username, followers, category, profile_pic, is_primary
        ) VALUES (
          u.id, clean_handle, norm_handle, COALESCE(u.followers, 0), u.category, u.instagram_profile_pic, true
        );
      END IF;
    END IF;
  END LOOP;
END $$;

-- 6. Sync users.instagram_profiles JSONB from user_instagram_profiles
UPDATE public.users u
SET instagram_profiles = COALESCE(
  (
    SELECT jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'username', p.username,
        'normalized_username', p.normalized_username,
        'followers', p.followers,
        'category', p.category,
        'profile_pic', p.profile_pic,
        'is_primary', p.is_primary,
        'is_verified', p.is_verified,
        'created_at', p.created_at
      ) ORDER BY p.is_primary DESC, p.created_at ASC
    )
    FROM public.user_instagram_profiles p
    WHERE p.user_id = u.id
  ),
  '[]'::jsonb
);
