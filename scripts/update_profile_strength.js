const { Pool } = require('pg');
require('dotenv').config({ path: '.env.local' });

const pool = new Pool({
  connectionString: 'postgresql://postgres.zqnedwjtppydkslhtbay:iJzDARF9wYq3v3AS@aws-1-ap-southeast-1.pooler.supabase.com:6543/postgres',
  ssl: { rejectUnauthorized: false }
});

async function main() {
  console.log('1. Creating calculate_profile_strength SQL function...');

  const createFuncSql = `
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
  `;
  await pool.query(createFuncSql);
  console.log('Function calculate_profile_strength created successfully.');

  console.log('2. Creating trigger for automatic profile_strength calculation on INSERT and UPDATE...');
  const createTriggerSql = `
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
  `;
  await pool.query(createTriggerSql);
  console.log('Trigger trg_set_profile_strength created successfully.');

  console.log('3. Updating all existing users in public.users...');
  const updateSql = `
    UPDATE public.users 
    SET profile_strength = calculate_profile_strength(users);
  `;
  const updateRes = await pool.query(updateSql);
  console.log(`Updated profile_strength for ${updateRes.rowCount} users.`);

  console.log('4. Verifying updated profile strengths on first 15 users...');
  const verifyRes = await pool.query(`
    SELECT influencer_id, full_name, profile_strength, category, city, state, followers
    FROM public.users
    ORDER BY influencer_seq_num ASC
    LIMIT 15;
  `);
  console.table(verifyRes.rows);

  console.log('5. Summary of profile_strength distribution:');
  const distRes = await pool.query(`
    SELECT 
      CASE 
        WHEN profile_strength >= 80 THEN '80% - 100% (High)'
        WHEN profile_strength >= 50 THEN '50% - 79% (Medium)'
        WHEN profile_strength > 0 THEN '1% - 49% (Low)'
        ELSE '0% (Empty)'
      END as tier,
      COUNT(*) as user_count
    FROM public.users
    GROUP BY 1
    ORDER BY MIN(profile_strength) DESC;
  `);
  console.table(distRes.rows);

  pool.end();
}

main().catch(err => {
  console.error('Migration error:', err);
  pool.end();
  process.exit(1);
});
