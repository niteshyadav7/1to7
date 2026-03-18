const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

async function seedAdmin() {
  try {
    // 1. Manually parse .env.local to get Supabase credentials
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const envVars = {};
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        envVars[match[1].trim()] = match[2].trim();
      }
    });

    const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
    const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']; // Or service role key if needed

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing SUPABASE URL or KEY in .env.local");
      return;
    }

    // 2. Initialize Supabase
    const supabase = createClient(supabaseUrl, supabaseKey);

    // 3. Hash the password
    const email = 'admin@gmail.com';
    const plainPassword = 'Admin@123';
    console.log(`Configuring account: ${email}`);
    
    // Using a cost of 10 matches the login route
    const salt = bcrypt.genSaltSync(10);
    const password_hash = bcrypt.hashSync(plainPassword, salt);

    // 4. Insert into the admins table
    const { data, error } = await supabase
      .from('admins')
      .insert([
        { 
          email: email, 
          password_hash: password_hash
        }
      ])
      .select();

    if (error) {
      console.error('Error inserting admin:', error.message);
    } else {
      console.log('✅ Admin successfully seeded!');
      console.log(data);
    }
  } catch (err) {
    console.error('Unexpected error:', err);
  }
}

seedAdmin();
