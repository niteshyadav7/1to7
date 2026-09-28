-- ==============================================================================
-- Migration: Add Point of Contact (POC) Assignment to Campaigns
-- Purpose: Enable assigning one or multiple Operations Admins as POC to campaigns.
-- Safety: Purely additive. Defaults to empty array '{}'. 100% non-breaking on live production.
-- ==============================================================================

-- 1. Add poc_admin_ids array column
ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS poc_admin_ids UUID[] DEFAULT '{}';

-- 2. Create GIN index for high-performance array lookups (e.g. "which campaigns am I assigned to?")
CREATE INDEX IF NOT EXISTS idx_campaigns_poc_admin_ids
  ON public.campaigns USING GIN (poc_admin_ids);

-- 3. Add column comment for documentation
COMMENT ON COLUMN public.campaigns.poc_admin_ids IS 'Array of admin/staff UUIDs assigned as Point of Contact (POC) for accountability and performance tracking.';
