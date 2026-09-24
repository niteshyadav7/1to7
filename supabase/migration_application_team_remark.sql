-- Migration: Add team_remark columns to public.applications
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS team_remark TEXT,
ADD COLUMN IF NOT EXISTS team_remark_by TEXT,
ADD COLUMN IF NOT EXISTS team_remark_updated_at TIMESTAMPTZ;

-- Index for searching and filtering remarks if needed
CREATE INDEX IF NOT EXISTS idx_applications_team_remark ON public.applications (team_remark) WHERE team_remark IS NOT NULL;
