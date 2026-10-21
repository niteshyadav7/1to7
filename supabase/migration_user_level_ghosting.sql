-- ==============================================================================
-- Migration: User-Level Direct Creator Ghosting & Account-Wide Accountability
-- Safety: Purely additive. Defaults to is_ghosted = FALSE. 100% non-breaking on live production.
-- ==============================================================================

-- 1. Users table ghosting status tracking
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS is_ghosted BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS ghosted_at TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ghosted_by UUID DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS ghost_reason TEXT DEFAULT NULL;

-- 2. Make application_id and campaign_id nullable in application_ghost_events for global account-level ghosting
ALTER TABLE public.application_ghost_events 
  ALTER COLUMN application_id DROP NOT NULL,
  ALTER COLUMN campaign_id DROP NOT NULL;

-- 3. High-performance Query Indexes
CREATE INDEX IF NOT EXISTS idx_users_is_ghosted ON public.users (is_ghosted) WHERE is_ghosted = true;

-- 4. Helpful documentation comments
COMMENT ON COLUMN public.users.is_ghosted IS 'Account-level flag indicating whether creator has been marked ghosted by admin.';
COMMENT ON COLUMN public.users.ghost_reason IS 'Primary reason why the creator account was marked ghosted.';
