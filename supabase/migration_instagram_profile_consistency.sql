-- Migration: Instagram Profile Consistency & Audit Logging
-- Creates instagram_profile_logs, repairs profile_logs, and adds added_by tracking

-- 1. Create instagram_profile_logs table
CREATE TABLE IF NOT EXISTS public.instagram_profile_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type     TEXT NOT NULL,
  user_id        UUID REFERENCES public.users(id) ON DELETE CASCADE,
  application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  campaign_id    UUID REFERENCES public.campaigns(id) ON DELETE SET NULL,
  profile_id     UUID,
  old_username   TEXT,
  new_username   TEXT,
  actor_type     TEXT NOT NULL CHECK (actor_type IN ('creator','admin','system','oauth')),
  actor_id       TEXT,
  actor_name     TEXT,
  reason         TEXT,
  metadata       JSONB DEFAULT '{}'::jsonb,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for fast query performance in timeline drawers & global logs
CREATE INDEX IF NOT EXISTS idx_iglogs_user ON public.instagram_profile_logs(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_iglogs_application ON public.instagram_profile_logs(application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_iglogs_event ON public.instagram_profile_logs(event_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_iglogs_created_at ON public.instagram_profile_logs(created_at DESC);

-- Enable RLS and add service-role policy
ALTER TABLE public.instagram_profile_logs ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'instagram_profile_logs' AND policyname = 'service-role all on instagram_profile_logs'
  ) THEN
    CREATE POLICY "service-role all on instagram_profile_logs" ON public.instagram_profile_logs FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 2. Repair legacy profile_logs table so admin audit inserts stop failing silently
ALTER TABLE public.profile_logs ADD COLUMN IF NOT EXISTS changed_by TEXT DEFAULT 'self';
ALTER TABLE public.profile_logs ADD COLUMN IF NOT EXISTS admin_name TEXT;

-- 3. Add added_by tracking on user_instagram_profiles to know who added it ('self' | 'admin:<id>' | 'oauth' | 'backfill')
ALTER TABLE public.user_instagram_profiles ADD COLUMN IF NOT EXISTS added_by TEXT DEFAULT 'self';
