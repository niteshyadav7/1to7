-- Migration: Auto-calculate and maintain profile_strength across public.users
-- Calculates profile completeness based on 13 key fields:
-- full_name, instagram_username, gender, category, languages, state, city,
-- followers, dob, account_name, account_number, ifsc_code, shipping_addresses / remarks

CREATE OR REPLACE FUNCTION calculate_profile_strength(u public.users)
RETURNS INTEGER AS $$
DECLARE
  filled INTEGER := 0;
  total_fields INTEGER := 13;
BEGIN
  IF u.full_name IS NOT NULL AND TRIM(u.full_name) <> '' THEN filled := filled + 1; END IF;
  IF u.instagram_username IS NOT NULL AND TRIM(u.instagram_username) <> '' THEN filled := filled + 1; END IF;
  IF u.gender IS NOT NULL AND TRIM(u.gender) <> '' THEN filled := filled + 1; END IF;
  IF u.category IS NOT NULL AND TRIM(u.category) <> '' THEN filled := filled + 1; END IF;
  IF u.languages IS NOT NULL AND TRIM(u.languages) <> '' THEN filled := filled + 1; END IF;
  IF u.state IS NOT NULL AND TRIM(u.state) <> '' THEN filled := filled + 1; END IF;
  IF u.city IS NOT NULL AND TRIM(u.city) <> '' THEN filled := filled + 1; END IF;
  IF u.followers IS NOT NULL AND u.followers > 0 THEN filled := filled + 1; END IF;
  IF u.dob IS NOT NULL AND TRIM(u.dob) <> '' THEN filled := filled + 1; END IF;
  IF u.account_name IS NOT NULL AND TRIM(u.account_name) <> '' THEN filled := filled + 1; END IF;
  IF u.account_number IS NOT NULL AND TRIM(u.account_number) <> '' THEN filled := filled + 1; END IF;
  IF u.ifsc_code IS NOT NULL AND TRIM(u.ifsc_code) <> '' THEN filled := filled + 1; END IF;
  IF (u.shipping_addresses IS NOT NULL AND jsonb_typeof(u.shipping_addresses) = 'array' AND jsonb_array_length(u.shipping_addresses) > 0)
     OR (u.address_remarks IS NOT NULL AND TRIM(u.address_remarks) <> '') THEN 
    filled := filled + 1; 
  END IF;

  RETURN LEAST(100, ROUND((filled::NUMERIC / total_fields) * 100));
END;
$$ LANGUAGE plpgsql STABLE;

-- Trigger to automatically calculate profile_strength whenever a user is inserted or updated
CREATE OR REPLACE FUNCTION trigger_set_profile_strength()
RETURNS TRIGGER AS $$
BEGIN
  NEW.profile_strength := calculate_profile_strength(NEW);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_set_profile_strength ON public.users;
CREATE TRIGGER trg_set_profile_strength
BEFORE INSERT OR UPDATE ON public.users
FOR EACH ROW
EXECUTE FUNCTION trigger_set_profile_strength();

-- Initial batch update for all existing records
UPDATE public.users 
SET profile_strength = calculate_profile_strength(users);
