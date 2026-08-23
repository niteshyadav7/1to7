-- Migration: Add min_followers and enforce_followers to campaigns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS min_followers INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS enforce_followers BOOLEAN DEFAULT false;

-- Auto-populate min_followers for existing campaigns where followers text contains numeric/k/m patterns
UPDATE public.campaigns
SET min_followers = CASE
    WHEN followers ILIKE '%100k%' THEN 100000
    WHEN followers ILIKE '%50k%' THEN 50000
    WHEN followers ILIKE '%25k%' THEN 25000
    WHEN followers ILIKE '%20k%' THEN 20000
    WHEN followers ILIKE '%15k%' THEN 15000
    WHEN followers ILIKE '%10k%' THEN 10000
    WHEN followers ILIKE '%5k%' THEN 5000
    WHEN followers ILIKE '%3k%' THEN 3000
    WHEN followers ILIKE '%2k%' THEN 2000
    WHEN followers ILIKE '%1k%' THEN 1000
    ELSE 0
END
WHERE min_followers IS NULL OR min_followers = 0;
