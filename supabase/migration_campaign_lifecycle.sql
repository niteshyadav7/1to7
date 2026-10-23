-- Migration: Add 'Completed' to campaign_status enum and add lifecycle audit columns
ALTER TYPE campaign_status ADD VALUE IF NOT EXISTS 'Completed';

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_by_admin_id UUID,
  ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_by_admin_id UUID;

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON public.campaigns(status);
