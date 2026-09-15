-- Migration: Admin Google Sign-In and Approval Workflow
-- 1. Make password_hash nullable for OAuth / Google users
ALTER TABLE public.admins ALTER COLUMN password_hash DROP NOT NULL;

-- 2. Add auth_provider, avatar_url, approval_status, approved_by, approved_at
ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS auth_provider TEXT NOT NULL DEFAULT 'credentials',
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS approved_by UUID,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITH TIME ZONE;

-- 3. Ensure existing admins are set to approved & credentials
UPDATE public.admins
SET 
  approval_status = 'approved',
  auth_provider = COALESCE(auth_provider, 'credentials')
WHERE approval_status IS NULL OR auth_provider IS NULL;
