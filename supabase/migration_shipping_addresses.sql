-- Migration: Add shipping_addresses and address_remarks to public.users
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS shipping_addresses JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS address_remarks TEXT;

-- Populate initial shipping_address from existing city/state for users with empty addresses
UPDATE public.users
SET shipping_addresses = jsonb_build_array(
  jsonb_build_object(
    'id', gen_random_uuid(),
    'title', 'Primary Address',
    'recipient_name', COALESCE(full_name, 'Creator'),
    'mobile', COALESCE(mobile, ''),
    'address_line1', '',
    'address_line2', '',
    'landmark', '',
    'city', COALESCE(city, ''),
    'state', COALESCE(state, ''),
    'pincode', '',
    'delivery_remarks', '',
    'is_default', true,
    'created_at', now()
  )
)
WHERE (shipping_addresses IS NULL OR shipping_addresses = '[]'::jsonb) 
  AND (city IS NOT NULL AND city != '' OR state IS NOT NULL AND state != '');

-- Create GIN index on shipping_addresses for fast json queries
CREATE INDEX IF NOT EXISTS idx_users_shipping_addresses ON public.users USING gin (shipping_addresses);
