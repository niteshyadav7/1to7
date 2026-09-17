-- Migration: Add influencer_seq_num generated column and index for true numerical sorting
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS influencer_seq_num BIGINT 
GENERATED ALWAYS AS (
  CASE 
    WHEN influencer_id ~ '^HY[0-9]+$' 
    THEN CAST(SUBSTRING(influencer_id FROM 3) AS BIGINT)
    ELSE 0 
  END
) STORED;

CREATE INDEX IF NOT EXISTS idx_users_influencer_seq_num ON public.users(influencer_seq_num DESC);
