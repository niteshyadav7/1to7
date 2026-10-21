-- Migration: Campaign-Wise Broadcast Alerts & Admin Audit Tracking
-- Idempotent & Zero-Downtime

-- 1. Add campaign targeting columns to public.broadcast_alerts
ALTER TABLE public.broadcast_alerts 
  ADD COLUMN IF NOT EXISTS target_campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS target_campaign_name TEXT,
  ADD COLUMN IF NOT EXISTS target_campaign_code TEXT,
  ADD COLUMN IF NOT EXISTS target_campaign_status TEXT DEFAULT 'all';

-- 2. Create index for high-throughput creator dashboard delivery query
CREATE INDEX IF NOT EXISTS idx_broadcast_alerts_campaign 
  ON public.broadcast_alerts(target_campaign_id, is_active) 
  WHERE target_type = 'campaign';

-- 3. Create index for fast user delivery lookup
CREATE INDEX IF NOT EXISTS idx_broadcast_alerts_user
  ON public.broadcast_alerts(target_user_id, is_active)
  WHERE target_type = 'specific_user';
