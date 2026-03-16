
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log('Checking for users table...');
  const { data, error } = await supabase.from('users').select('id').limit(1);
  if (error) {
    console.error('Table Check Error:', error);
  } else {
    console.log('Table Check Success! Data:', data);
  }
}

check();
