-- Migration: Add budget_amount, partial_payment_enabled, partial_payment_config to campaigns
-- Run this on your Supabase database

ALTER TABLE public.campaigns 
  ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS partial_payment_enabled BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS partial_payment_config JSONB DEFAULT '{}'::jsonb;
