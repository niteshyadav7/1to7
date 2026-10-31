-- Migration: Add campaign-level completion form control and custom deliverables fields
-- 1. require_deliverable_link: whether live link is strictly required (default true)
-- 2. require_analytics_proof: whether analytics screenshot proof is strictly required (default false)
-- 3. completion_form_fields: dynamic custom fields for campaign deliverables (default empty array)

ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS require_deliverable_link BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS require_analytics_proof BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS completion_form_fields JSONB DEFAULT '[]'::jsonb;

