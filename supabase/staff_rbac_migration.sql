-- Migration: Dynamic RBAC & Staff Management
-- 1. Add RBAC and status columns to public.admins if they don't exist
ALTER TABLE public.admins
  ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'admin',
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_login TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now());

-- 2. Create roles table for dynamic role creation
CREATE TABLE IF NOT EXISTS public.roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  description TEXT,
  permissions JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_system BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Enable RLS and add open policy for service role on roles
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'roles' AND policyname = 'Enable ALL for service-role on roles'
  ) THEN
    CREATE POLICY "Enable ALL for service-role on roles" ON public.roles FOR ALL USING (true) WITH CHECK (true);
  END IF;
END $$;

-- 3. Seed Default System Roles
INSERT INTO public.roles (name, display_name, description, permissions, is_system)
VALUES
  (
    'super_admin',
    'Super Admin',
    'Full unrestricted access to all tabs, actions, staff management, and system configuration.',
    '{
      "dashboard": ["view"],
      "campaigns": ["view", "create", "edit", "delete"],
      "applications": ["view", "edit", "delete"],
      "order_details": ["view", "edit", "delete"],
      "payments": ["view", "edit", "export"],
      "feedback": ["view", "edit"],
      "analytics": ["view", "export"],
      "import": ["view", "create"],
      "influencers": ["view", "edit", "delete"],
      "staff": ["view", "create", "edit", "delete", "reset_password"],
      "roles": ["view", "create", "edit", "delete"]
    }'::jsonb,
    true
  ),
  (
    'admin',
    'Operations Admin',
    'Manage campaigns, applications, payments, influencers, and operational data.',
    '{
      "dashboard": ["view"],
      "campaigns": ["view", "create", "edit", "delete"],
      "applications": ["view", "edit", "delete"],
      "order_details": ["view", "edit", "delete"],
      "payments": ["view", "edit", "export"],
      "feedback": ["view", "edit"],
      "analytics": ["view", "export"],
      "import": ["view", "create"],
      "influencers": ["view", "edit", "delete"]
    }'::jsonb,
    true
  ),
  (
    'campaign_manager',
    'Campaign Manager',
    'Manage campaigns, review influencer applications, and coordinate order details.',
    '{
      "dashboard": ["view"],
      "campaigns": ["view", "create", "edit"],
      "applications": ["view", "edit"],
      "order_details": ["view", "edit"],
      "feedback": ["view"],
      "influencers": ["view", "edit"]
    }'::jsonb,
    true
  ),
  (
    'finance_lead',
    'Finance Lead',
    'Manage financial payouts, approve payments, view order details and analytics.',
    '{
      "dashboard": ["view"],
      "payments": ["view", "edit", "export"],
      "order_details": ["view"],
      "analytics": ["view", "export"]
    }'::jsonb,
    true
  ),
  (
    'viewer',
    'Support / Viewer',
    'Read-only access to view applications, influencers, campaigns, and user feedback.',
    '{
      "dashboard": ["view"],
      "campaigns": ["view"],
      "applications": ["view"],
      "order_details": ["view"],
      "feedback": ["view"],
      "influencers": ["view"]
    }'::jsonb,
    true
  )
ON CONFLICT (name) DO UPDATE 
SET 
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  permissions = EXCLUDED.permissions,
  is_system = EXCLUDED.is_system;

-- 4. Promote existing admins to super_admin by default if they are currently just default role
UPDATE public.admins 
SET role = 'super_admin', is_active = true
WHERE role = 'admin' OR role = 'staff' OR role IS NULL;
