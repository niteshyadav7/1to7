-- =====================================================================
-- Migration: Add Creator-Facing Public Alias and Phone to Admins (POCs)
-- Ensures staff real names and personal mobile numbers remain private
-- =====================================================================

ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS creator_view_name TEXT,
  ADD COLUMN IF NOT EXISTS creator_view_phone TEXT;

COMMENT ON COLUMN public.admins.creator_view_name IS 'Public alias displayed to influencers on campaign pages and deliverable modals. Staff real names remain strictly private.';
COMMENT ON COLUMN public.admins.creator_view_phone IS 'Public WhatsApp/calling line for influencer queries. Staff personal mobile numbers remain strictly private.';
