-- Migration: Add Pre-Launch Pilot / Test Mode fields to public.campaigns table
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS test_user_ids TEXT[] DEFAULT '{}'::text[],
ADD COLUMN IF NOT EXISTS test_creators JSONB DEFAULT '[]'::jsonb;

-- Create index for fast filtering of pilot campaigns
CREATE INDEX IF NOT EXISTS idx_campaigns_test_mode ON public.campaigns(is_test_mode);

COMMENT ON COLUMN public.campaigns.is_test_mode IS 'If true, campaign is in pre-launch pilot mode and only visible/applyable by selected test creators';
COMMENT ON COLUMN public.campaigns.test_user_ids IS 'Array of user UUIDs who are permitted to view and apply to this pilot campaign';
COMMENT ON COLUMN public.campaigns.test_creators IS 'Cached snapshot array of selected test creators [{id, name, email, instagram_username, influencer_id, followers}] for fast UI rendering';
