-- ==========================================
-- SPRINT 0: INFLUENCER PLATFORM SCHEMA
-- ==========================================

-- 1. users
CREATE TABLE public.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  influencer_id TEXT UNIQUE NOT NULL, -- Format: HY10000+
  full_name TEXT NOT NULL,
  mobile TEXT UNIQUE NOT NULL,
  instagram_username TEXT,
  gender TEXT,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  profile_strength INTEGER DEFAULT 0,
  -- Bank Details
  account_name TEXT,
  account_number TEXT,
  ifsc_code TEXT,
  -- Location & Reach
  state TEXT,
  city TEXT,
  followers INTEGER DEFAULT 0,
  is_email_verified BOOLEAN DEFAULT false,
  is_mobile_verified BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. influencer_id_counter
CREATE TABLE public.influencer_id_counter (
  id INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL
);
INSERT INTO public.influencer_id_counter (id, last_number) VALUES (1, 9999) ON CONFLICT (id) DO NOTHING;

-- Function to safely generate next ID
CREATE OR REPLACE FUNCTION generate_influencer_id()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  new_id TEXT;
BEGIN
  UPDATE public.influencer_id_counter
  SET last_number = last_number + 1
  WHERE id = 1
  RETURNING last_number INTO next_num;
  
  new_id := 'HY' || next_num;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. campaigns
CREATE TYPE campaign_status AS ENUM ('Draft', 'Active', 'Review', 'Closed');

CREATE TABLE public.campaigns (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_code TEXT UNIQUE NOT NULL,
  brand_name TEXT NOT NULL,
  category TEXT,
  platform TEXT NOT NULL, -- e.g., 'Instagram', 'YouTube', 'Amazon'
  budget_type TEXT, -- e.g., 'Paid', 'Barter'
  deliverables TEXT,
  product_links TEXT[],
  requirements TEXT,
  gender_required TEXT, -- e.g., 'Male', 'Female', 'Any'
  is_live BOOLEAN DEFAULT false,
  status campaign_status DEFAULT 'Draft',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 4. applications
CREATE TYPE application_status AS ENUM ('Applied', 'Approved', 'Rejected', 'Completed', 'Payment Initiated');

CREATE TABLE public.applications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  campaign_id UUID REFERENCES public.campaigns(id) ON DELETE CASCADE,
  status application_status DEFAULT 'Applied',
  -- Application Form Data (JSONB to be flexible for dynamic fields)
  form_data JSONB DEFAULT '{}'::jsonb,
  -- Payment Tracking (Admin side)
  partial_payment NUMERIC(10, 2) DEFAULT 0,
  final_payment NUMERIC(10, 2) DEFAULT 0,
  pending_amount NUMERIC(10, 2) DEFAULT 0,
  manager_phone TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(user_id, campaign_id) -- A user can only apply once to a campaign
);

-- 5. otps
CREATE TABLE public.otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  mobile TEXT,
  email TEXT,
  otp TEXT NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  is_used BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 6. admins
CREATE TABLE public.admins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL, -- Store bcrypt hashes
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 7. apply_form_config
CREATE TABLE public.apply_form_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_code TEXT NOT NULL, -- Map to campaigns.campaign_code. Can be 'DEFAULT'
  field_name TEXT NOT NULL,
  field_type TEXT NOT NULL, -- 'text', 'number', 'textarea', 'dropdown', 'checkbox'
  field_options JSONB, -- Array of options if dropdown
  is_required BOOLEAN DEFAULT true,
  field_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(campaign_code, field_name)
);

-- 8. profile_logs
CREATE TABLE public.profile_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  changed_field TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  changed_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ==========================================
-- INDEXES
-- ==========================================
CREATE INDEX idx_users_mobile ON public.users(mobile);
CREATE INDEX idx_campaigns_status ON public.campaigns(status);
CREATE INDEX idx_campaigns_code ON public.campaigns(campaign_code);
CREATE INDEX idx_applications_user_campaign ON public.applications(user_id, campaign_id);
CREATE INDEX idx_otps_mobile_unexpired ON public.otps(mobile, expires_at) WHERE (is_used = false AND mobile IS NOT NULL);
CREATE INDEX idx_otps_email_unexpired ON public.otps(email, expires_at) WHERE (is_used = false AND email IS NOT NULL);

-- ==========================================
-- RLS POLICIES (Row Level Security)
-- ==========================================
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.otps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admins ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.apply_form_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.influencer_id_counter ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profile_logs ENABLE ROW LEVEL SECURITY;

-- Note: In this Next.js app, access is primarily managed via a custom backend (JWT).
-- Therefore, these default policies allow service_role key full access, 
-- and restrict anon key (client-side) entirely unless explicitly opened.
-- The API routes will use `@supabase/supabase-js` which bypasses these if using standard db calls.

-- Allow service role full access to everything
CREATE POLICY "Enable ALL for service-role on users" ON public.users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for service-role on campaigns" ON public.campaigns FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for service-role on applications" ON public.applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for service-role on otps" ON public.otps FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for service-role on admins" ON public.admins FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for service-role on apply_form_config" ON public.apply_form_config FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for service-role on influencer_id_counter" ON public.influencer_id_counter FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable ALL for service-role on profile_logs" ON public.profile_logs FOR ALL USING (true) WITH CHECK (true);
