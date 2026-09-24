-- ========================================================
-- BROADCAST ALERTS & IN-APP POPUP NOTIFICATIONS SCHEMA
-- ========================================================

CREATE TABLE IF NOT EXISTS public.broadcast_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'warning', -- 'critical', 'warning', 'info', 'success'
  target_type TEXT DEFAULT 'all', -- 'all', 'missing_bank', 'specific_user'
  target_user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  target_user_identifier TEXT, -- HY ID, Phone, or Name for reference
  action_label TEXT DEFAULT 'Resolve Issue',
  action_url TEXT DEFAULT '/dashboard/profile',
  auto_duration_seconds INTEGER DEFAULT 8,
  allow_dismiss BOOLEAN DEFAULT true,
  auto_resolve_on_bank BOOLEAN DEFAULT true,
  is_active BOOLEAN DEFAULT true,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.alert_acknowledgements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  alert_id UUID REFERENCES public.broadcast_alerts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
  resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ,
  dismissed_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
  UNIQUE(alert_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_broadcast_alerts_active ON public.broadcast_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_broadcast_alerts_target ON public.broadcast_alerts(target_type, target_user_id);
CREATE INDEX IF NOT EXISTS idx_alert_ack_user ON public.alert_acknowledgements(user_id, alert_id);
