-- ==========================================================
-- Supabase Schema: Feedback Table
-- ==========================================================

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  influencer_id TEXT,
  full_name TEXT,
  email TEXT,
  mobile TEXT,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  category TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for efficient querying by user & created_at
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_category ON public.feedback(category);
CREATE INDEX IF NOT EXISTS idx_feedback_rating ON public.feedback(rating);

-- RLS Policies
ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public feedback insert"
  ON public.feedback FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow service role full access"
  ON public.feedback FOR ALL
  USING (true);
