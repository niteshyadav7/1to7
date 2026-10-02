-- Migration: Atomic HY ID generation via PostgreSQL RPC functions
-- This eliminates race conditions and gaps in influencer ID assignment

-- ============================================================
-- Function 1: get_next_influencer_id()
-- Returns the next sequential number (atomically incremented)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_next_influencer_id()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_val INTEGER;
BEGIN
  -- Atomic increment + return in a single operation
  UPDATE public.influencer_id_counter
  SET last_number = last_number + 1
  WHERE id = 1
  RETURNING last_number INTO next_val;

  -- Safety: if counter row doesn't exist, create it from actual max
  IF next_val IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(influencer_id FROM 3) AS INTEGER)), 24789)
    INTO next_val
    FROM public.users
    WHERE influencer_id ~ '^HY[0-9]+$'
      AND CAST(SUBSTRING(influencer_id FROM 3) AS INTEGER) < 1000000;

    next_val := next_val + 1;

    INSERT INTO public.influencer_id_counter (id, last_number)
    VALUES (1, next_val)
    ON CONFLICT (id) DO UPDATE SET last_number = next_val;
  END IF;

  RETURN next_val;
END;
$$;

-- ============================================================
-- Function 2: get_next_influencer_id_batch(count)
-- Reserves N consecutive IDs atomically, returns the FIRST number
-- Caller assigns: first, first+1, first+2, ..., first+(count-1)
-- ============================================================
CREATE OR REPLACE FUNCTION public.get_next_influencer_id_batch(batch_count INTEGER)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  start_val INTEGER;
BEGIN
  -- Validate input
  IF batch_count <= 0 OR batch_count > 1000 THEN
    RAISE EXCEPTION 'batch_count must be between 1 and 1000, got %', batch_count;
  END IF;

  -- Atomic: increment by batch_count, return the value BEFORE increment + 1
  -- e.g. if last_number was 24789 and batch_count is 3:
  --   last_number becomes 24792, start_val = 24790
  UPDATE public.influencer_id_counter
  SET last_number = last_number + batch_count
  WHERE id = 1
  RETURNING last_number - batch_count + 1 INTO start_val;

  -- Safety fallback
  IF start_val IS NULL THEN
    SELECT COALESCE(MAX(CAST(SUBSTRING(influencer_id FROM 3) AS INTEGER)), 24789)
    INTO start_val
    FROM public.users
    WHERE influencer_id ~ '^HY[0-9]+$'
      AND CAST(SUBSTRING(influencer_id FROM 3) AS INTEGER) < 1000000;

    start_val := start_val + 1;

    INSERT INTO public.influencer_id_counter (id, last_number)
    VALUES (1, start_val + batch_count - 1)
    ON CONFLICT (id) DO UPDATE SET last_number = start_val + batch_count - 1;
  END IF;

  RETURN start_val;
END;
$$;

-- ============================================================
-- Resync: Set counter to actual current max before going live
-- ============================================================
UPDATE public.influencer_id_counter
SET last_number = (
  SELECT COALESCE(MAX(CAST(SUBSTRING(influencer_id FROM 3) AS INTEGER)), 24789)
  FROM public.users
  WHERE influencer_id ~ '^HY[0-9]+$'
    AND CAST(SUBSTRING(influencer_id FROM 3) AS INTEGER) < 1000000
)
WHERE id = 1;

-- Grant execute permissions for the anon/authenticated roles (Supabase)
GRANT EXECUTE ON FUNCTION public.get_next_influencer_id() TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_next_influencer_id_batch(INTEGER) TO anon, authenticated, service_role;
