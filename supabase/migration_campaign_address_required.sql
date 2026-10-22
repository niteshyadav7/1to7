-- Migration: Campaign Address Requirement & Address Verification Status
-- Adds address_required to campaigns, and address verification metadata to applications

ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS address_required BOOLEAN DEFAULT false;

-- Add index on address_required
CREATE INDEX IF NOT EXISTS idx_campaigns_address_required ON public.campaigns (address_required);

-- Applications address verification tracking
ALTER TABLE public.applications 
ADD COLUMN IF NOT EXISTS address_status VARCHAR(50) DEFAULT NULL,
ADD COLUMN IF NOT EXISTS address_verified_at TIMESTAMPTZ DEFAULT NULL,
ADD COLUMN IF NOT EXISTS address_verified_by UUID DEFAULT NULL;

-- Ensure GIN index on users.shipping_addresses
CREATE INDEX IF NOT EXISTS idx_users_shipping_addresses ON public.users USING gin (shipping_addresses);
