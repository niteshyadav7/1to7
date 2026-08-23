-- Migration: Add completion timeline and delay exemption columns
-- 1. Campaign-level completion timeline settings
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS completion_days INTEGER DEFAULT 7,
ADD COLUMN IF NOT EXISTS completion_deadline TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS enforce_completion_deadline BOOLEAN DEFAULT TRUE;

-- 2. Application-level completion deadline and admin exemption controls
ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS completion_deadline TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS is_delay_exempted BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS delay_exemption_reason TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS completion_submitted_at TIMESTAMPTZ DEFAULT NULL;

-- 3. Indexes for fast query lookup during application checks
CREATE INDEX IF NOT EXISTS idx_applications_user_status ON public.applications (user_id, status);
CREATE INDEX IF NOT EXISTS idx_applications_delay_exempted ON public.applications (is_delay_exempted);
