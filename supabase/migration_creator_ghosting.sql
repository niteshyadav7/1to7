-- ==============================================================================
-- Migration: Creator Ghosting & Accountability Audit System
-- Safety: Purely additive. Defaults to is_ghosted = FALSE. 100% non-breaking on live production.
-- ==============================================================================

-- 1. Applications table ghosting status & reminder tracking
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS is_ghosted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ghosted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ghosted_by UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ghost_alert_id UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS overdue_reminder_count INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_overdue_reminder_at TIMESTAMPTZ DEFAULT NULL;

-- 2. Append-only Immutable Ghost Events History
CREATE TABLE IF NOT EXISTS public.application_ghost_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id UUID NOT NULL REFERENCES public.applications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  action TEXT NOT NULL CHECK (action IN ('ghosted', 'unghosted')),
  reason_category TEXT NOT NULL,
  comment TEXT NOT NULL CHECK (char_length(trim(comment)) >= 15),
  proof_urls TEXT[] NOT NULL CHECK (array_length(proof_urls, 1) >= 1),
  batch_id UUID DEFAULT NULL,
  actor_admin_id UUID NOT NULL,
  actor_name TEXT,
  actor_role TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 3. High-performance Query Indexes
CREATE INDEX IF NOT EXISTS idx_ghost_events_user ON public.application_ghost_events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ghost_events_app ON public.application_ghost_events (application_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ghost_events_campaign ON public.application_ghost_events (campaign_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_applications_ghosted_user ON public.applications (user_id) WHERE is_ghosted = true;
CREATE INDEX IF NOT EXISTS idx_applications_is_ghosted ON public.applications (is_ghosted);

-- 4. Helpful documentation comments
COMMENT ON COLUMN public.applications.is_ghosted IS 'Flag indicating whether creator has been marked ghosted by campaign POC/Admin.';
COMMENT ON COLUMN public.applications.ghost_alert_id IS 'Reference to the broadcast_alerts popup ID displayed to creator, deactivated upon unghosting.';
COMMENT ON TABLE public.application_ghost_events IS 'Immutable append-only audit trail of all creator ghosting and un-ghosting actions with proof screenshots and justifications.';
