-- Migration: BEFORE INSERT trigger on users table for automatic, transaction-safe sequential HY ID assignment
-- This guarantees:
-- 1. IDs are assigned INSIDE the database transaction during INSERT.
-- 2. If the INSERT rolls back (e.g. unique constraint violation on email/mobile/etc.), the counter also rolls back. Zero wasted IDs!
-- 3. If an explicit influencer_id is provided (e.g. from historical import), it is preserved.
-- 4. If an explicit influencer_id is higher than counter, counter is safely forwarded to prevent future collisions.

-- 1. Create or replace the trigger function
CREATE OR REPLACE FUNCTION public.assign_sequential_influencer_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  next_num INTEGER;
  explicit_num INTEGER;
BEGIN
  -- Check if influencer_id was omitted, NULL, or empty
  IF NEW.influencer_id IS NULL OR TRIM(NEW.influencer_id) = '' THEN
    -- Lock and increment the counter row atomically
    UPDATE public.influencer_id_counter
    SET last_number = last_number + 1
    WHERE id = 1
    RETURNING last_number INTO next_num;

    -- Fallback: if counter row id=1 doesn't exist, initialize from current max in users table
    IF next_num IS NULL THEN
      SELECT COALESCE(MAX(CAST(SUBSTRING(influencer_id FROM 3) AS INTEGER)), 24802)
      INTO next_num
      FROM public.users
      WHERE influencer_id ~ '^HY[0-9]+$'
        AND CAST(SUBSTRING(influencer_id FROM 3) AS INTEGER) < 1000000;

      next_num := next_num + 1;

      INSERT INTO public.influencer_id_counter (id, last_number)
      VALUES (1, next_num)
      ON CONFLICT (id) DO UPDATE SET last_number = next_num;
    END IF;

    -- Assign the strictly sequential ID
    NEW.influencer_id := 'HY' || next_num;
  ELSE
    -- An explicit influencer_id was provided (e.g. historical CSV import)
    -- If it's a valid HY ID, ensure our counter doesn't lag behind it
    IF NEW.influencer_id ~ '^HY[0-9]+$' THEN
      explicit_num := CAST(SUBSTRING(NEW.influencer_id FROM 3) AS INTEGER);
      IF explicit_num < 1000000 THEN
        UPDATE public.influencer_id_counter
        SET last_number = GREATEST(last_number, explicit_num)
        WHERE id = 1;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- 2. Create the trigger on users
DROP TRIGGER IF EXISTS trigger_assign_sequential_influencer_id ON public.users;

CREATE TRIGGER trigger_assign_sequential_influencer_id
BEFORE INSERT ON public.users
FOR EACH ROW
EXECUTE FUNCTION public.assign_sequential_influencer_id();

-- 3. Resync the counter to the true actual max in the users table
UPDATE public.influencer_id_counter
SET last_number = (
  SELECT COALESCE(MAX(CAST(SUBSTRING(influencer_id FROM 3) AS INTEGER)), 24802)
  FROM public.users
  WHERE influencer_id ~ '^HY[0-9]+$'
    AND CAST(SUBSTRING(influencer_id FROM 3) AS INTEGER) < 1000000
)
WHERE id = 1;
