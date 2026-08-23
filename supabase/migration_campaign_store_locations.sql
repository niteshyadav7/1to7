-- Migration: Add store_locations to campaigns and selected_store to applications
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS store_locations JSONB DEFAULT '[]'::jsonb;

ALTER TABLE public.applications
ADD COLUMN IF NOT EXISTS selected_store JSONB DEFAULT NULL;

-- Create index on campaigns store_locations for JSON operations
CREATE INDEX IF NOT EXISTS idx_campaigns_store_locations ON public.campaigns USING GIN (store_locations);
