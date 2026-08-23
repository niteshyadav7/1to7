-- Migration: Add location targeting fields to public.campaigns table
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS location_type TEXT DEFAULT 'PAN_INDIA',
ADD COLUMN IF NOT EXISTS target_states TEXT[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS target_cities TEXT[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS enforce_location BOOLEAN DEFAULT false;

COMMENT ON COLUMN public.campaigns.location_type IS 'Location targeting scope: PAN_INDIA, STATES, or CITIES';
COMMENT ON COLUMN public.campaigns.target_states IS 'List of allowed states in uppercase (e.g. UTTAR PRADESH, MAHARASHTRA)';
COMMENT ON COLUMN public.campaigns.target_cities IS 'List of allowed cities/districts (e.g. Mumbai, Pune, Lucknow, Noida)';
COMMENT ON COLUMN public.campaigns.enforce_location IS 'If true, creator must have at least one saved address in target locations';
