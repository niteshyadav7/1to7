
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Testing generate_influencer_id RPC...');
  const { data, error } = await supabase.rpc('generate_influencer_id');
  if (error) {
    console.error('RPC Error:', error);
  } else {
    console.log('RPC Success! Data:', data);
  }
}

check();
