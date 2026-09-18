-- ==========================================================
-- Supabase Schema: User Issues Table
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.user_issues (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  ticket_id TEXT UNIQUE,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT NOT NULL,
  source_page TEXT NOT NULL DEFAULT 'login', -- 'login' | 'signup'
  issue_type TEXT NOT NULL, -- 'otp_not_received', 'login_failed', 'signup_failed', 'recaptcha_stuck', 'other'
  description TEXT NOT NULL,
  screenshot_url TEXT,
  screenshot_name TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'in_progress', 'resolved', 'rejected'
  admin_notes TEXT,
  resolved_by TEXT,
  resolved_at TIMESTAMPTZ,
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast querying
CREATE INDEX IF NOT EXISTS idx_user_issues_created_at ON public.user_issues(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_user_issues_status ON public.user_issues(status);
CREATE INDEX IF NOT EXISTS idx_user_issues_mobile ON public.user_issues(mobile);
CREATE INDEX IF NOT EXISTS idx_user_issues_email ON public.user_issues(email);
CREATE INDEX IF NOT EXISTS idx_user_issues_ticket_id ON public.user_issues(ticket_id);

-- Permissions
GRANT ALL ON TABLE public.user_issues TO anon, authenticated, service_role;

-- RLS Configuration
ALTER TABLE public.user_issues ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert to user_issues" ON public.user_issues;
CREATE POLICY "Allow public insert to user_issues"
  ON public.user_issues FOR INSERT
  WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public select on user_issues" ON public.user_issues;
CREATE POLICY "Allow public select on user_issues"
  ON public.user_issues FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow public update on user_issues" ON public.user_issues;
CREATE POLICY "Allow public update on user_issues"
  ON public.user_issues FOR UPDATE
  USING (true);

DROP POLICY IF EXISTS "Allow service_role full access on user_issues" ON public.user_issues;
CREATE POLICY "Allow service_role full access on user_issues"
  ON public.user_issues FOR ALL
  USING (true);
