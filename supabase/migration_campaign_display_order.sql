-- Migration: Add display_order column to public.campaigns
ALTER TABLE public.campaigns 
ADD COLUMN IF NOT EXISTS display_order INTEGER DEFAULT 0;

-- Initialize existing campaigns with sequential order based on created_at (most recent first = 1, 2, 3...)
WITH numbered AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at DESC) AS row_num
  FROM public.campaigns
)
UPDATE public.campaigns c
SET display_order = numbered.row_num
FROM numbered
WHERE c.id = numbered.id AND (c.display_order IS NULL OR c.display_order = 0);

-- Create index for fast sorting by display_order
CREATE INDEX IF NOT EXISTS idx_campaigns_display_order ON public.campaigns (display_order ASC);
