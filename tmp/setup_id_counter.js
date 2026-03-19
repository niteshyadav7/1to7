// Run this script to create the missing influencer_id_counter table and function in Supabase.
// Usage: node tmp/setup_id_counter.js

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function setup() {
  console.log('Creating influencer_id_counter table and generate_influencer_id function...');
  
  // Use rpc to run raw SQL via Supabase
  // First, try creating the table
  const { data: tableData, error: tableError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS public.influencer_id_counter (
        id INTEGER PRIMARY KEY,
        last_number INTEGER NOT NULL
      );
      INSERT INTO public.influencer_id_counter (id, last_number) VALUES (1, 9999) ON CONFLICT (id) DO NOTHING;
    `
  });

  if (tableError) {
    console.log('Could not create table via RPC (this is expected if exec_sql does not exist).');
    console.log('Error:', tableError.message);
    console.log('\n========================================');
    console.log('Please run the following SQL manually in your Supabase SQL Editor:');
    console.log('Go to: https://supabase.com/dashboard → your project → SQL Editor');
    console.log('========================================\n');
    console.log(`
-- 1. Create the counter table
CREATE TABLE IF NOT EXISTS public.influencer_id_counter (
  id INTEGER PRIMARY KEY,
  last_number INTEGER NOT NULL
);
INSERT INTO public.influencer_id_counter (id, last_number) VALUES (1, 9999) ON CONFLICT (id) DO NOTHING;

-- 2. Create the function
CREATE OR REPLACE FUNCTION generate_influencer_id()
RETURNS TEXT AS $$
DECLARE
  next_num INTEGER;
  new_id TEXT;
BEGIN
  UPDATE public.influencer_id_counter
  SET last_number = last_number + 1
  WHERE id = 1
  RETURNING last_number INTO next_num;
  
  new_id := 'HY' || next_num;
  RETURN new_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. Enable RLS
ALTER TABLE public.influencer_id_counter ENABLE ROW LEVEL SECURITY;

-- 4. Allow service-role access
CREATE POLICY "Enable ALL for service-role on influencer_id_counter" ON public.influencer_id_counter FOR ALL USING (true) WITH CHECK (true);
    `);
  } else {
    console.log('Table created successfully!');
  }
}

setup();
