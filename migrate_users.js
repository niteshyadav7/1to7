const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');
const Papa = require('papaparse');

// 1. Manually parse .env.local to get Supabase credentials
function loadEnv() {
  try {
    const envFile = fs.readFileSync('.env.local', 'utf8');
    const envVars = {};
    envFile.split('\n').forEach(line => {
      const match = line.match(/^([^=]+)=(.*)$/);
      if (match) {
        envVars[match[1].trim()] = match[2].trim();
      }
    });
    return envVars;
  } catch (error) {
    console.error("Error reading .env.local:", error.message);
    process.exit(1);
  }
}

const envVars = loadEnv();
const supabaseUrl = envVars['NEXT_PUBLIC_SUPABASE_URL'];
// Use Service Role key if available (bypasses RLS), otherwise fallback to Anon Key
const supabaseKey = envVars['SUPABASE_SERVICE_ROLE_KEY'] || envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY'];

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE URL or KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Default Password Hash for '12345'
const DEFAULT_PASSWORD_HASH = '$2b$10$rgMNYfe45OpevM8273RF2uFRjsAxq4ScGzgGOBtaywvDNKpqFJ7Wm';

// Extract pure handle from instagram links
function extractInstagramUsername(input) {
  if (!input) return null;
  let cleaned = input.trim();
  cleaned = cleaned.split('?')[0].split('#')[0].trim();
  let prev = '';
  while (cleaned !== prev) {
    prev = cleaned;
    cleaned = cleaned
      .replace(/^https?:\/\//i, '')
      .replace(/^www\./i, '')
      .replace(/^(m\.)?instagram\.com\//i, '')
      .replace(/^@/, '')
      .trim();
  }
  const segments = cleaned.split('/').filter(Boolean);
  let username = segments[0] || '';
  username = username.replace(/^@/, '').trim();
  return username || null;
}

// Map flexible CSV row keys
function getField(row, keys) {
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return String(row[k]).trim();
    }
  }
  return null;
}

function mapToDatabaseSchema(row) {
  const mobileRaw = getField(row, ['Phone', 'phone', 'Mobile', 'mobile', 'Mobile Number', 'Contact']);
  if (!mobileRaw) return null;
  
  const mobile = mobileRaw.replace(/[\s\-\+]/g, '');
  if (!mobile || mobile.length < 10) return null;

  const fullName = getField(row, ['Name', 'name', 'Full Name', 'full_name', 'Influencer Name']) || 'Creator';
  const userId = getField(row, ['User ID', 'user id', 'User Id', 'influencer_id', 'Influencer ID']);
  const email = getField(row, ['Email', 'email', 'Email ID', 'email id']) || `${mobile}@1to7.com`;
  const rawInsta = getField(row, ['Instagram ID', 'instagram id', 'Instagram', 'instagram', 'Insta ID', 'IG Handle']);
  const instaUsername = extractInstagramUsername(rawInsta);

  const genderRaw = getField(row, ['Gender', 'gender']);
  let gender = null;
  if (genderRaw) {
    const g = genderRaw.toLowerCase();
    if (g.startsWith('m')) gender = 'Male';
    else if (g.startsWith('f')) gender = 'Female';
    else gender = 'Other';
  }

  const followersRaw = getField(row, ['Followers', 'followers', 'Follower Count']);
  const followers = followersRaw ? parseInt(followersRaw.replace(/[^0-9]/g, ''), 10) || 0 : 0;

  const accountNumber = getField(row, ['Account Number', 'account number', 'Account No', 'account_number']);
  const ifscCode = getField(row, ['IFSC', 'ifsc', 'IFSC Code', 'ifsc_code']);
  const accountName = getField(row, ['Account Name', 'account name', 'account_name']);
  const state = getField(row, ['State', 'state']);
  const city = getField(row, ['City', 'city']);
  const category = getField(row, ['Category', 'category']);

  return {
    full_name: fullName,
    mobile: mobile,
    email: email,
    influencer_id: userId || null,
    instagram_username: instaUsername,
    gender: gender,
    account_number: accountNumber,
    account_name: accountName,
    ifsc_code: ifscCode,
    state: state,
    city: city,
    followers: followers,
    category: category,
    password_hash: DEFAULT_PASSWORD_HASH,
    is_email_verified: false,
    is_mobile_verified: true
  };
}

async function migrateUsers() {
  const targetFile = process.argv[2] || 'users.csv';
  const filePath = path.resolve(process.cwd(), targetFile);

  if (!fs.existsSync(filePath)) {
    console.error(`\n❌ ERROR: File '${targetFile}' not found!`);
    console.log(`Usage: node migrate_users.js <path-to-csv-file>`);
    console.log(`Or place your CSV in the project root named 'users.csv'\n`);
    process.exit(1);
  }

  console.log(`\n📂 Reading '${targetFile}'...`);
  const fileContent = fs.readFileSync(filePath, 'utf8');

  const parsed = Papa.parse(fileContent, {
    header: true,
    skipEmptyLines: true,
    transformHeader: h => h.trim()
  });

  const rawRows = parsed.data;
  console.log(`📊 Found ${rawRows.length} total rows in CSV.`);

  const validRecords = [];
  const seenMobiles = new Set();

  for (const row of rawRows) {
    const record = mapToDatabaseSchema(row);
    if (record && !seenMobiles.has(record.mobile)) {
      seenMobiles.add(record.mobile);
      validRecords.push(record);
    }
  }

  console.log(`✅ Prepared ${validRecords.length} unique valid records (default password: '12345').`);

  // Insert/upsert in chunks of 500
  const CHUNK_SIZE = 500;
  let successCount = 0;
  let maxNumericId = 0;

  console.log(`🚀 Starting bulk import into Supabase in batches of ${CHUNK_SIZE}...\n`);

  for (let i = 0; i < validRecords.length; i += CHUNK_SIZE) {
    const chunk = validRecords.slice(i, i + CHUNK_SIZE);
    
    const { error } = await supabase
      .from('users')
      .upsert(chunk, { onConflict: 'mobile' });

    if (error) {
      console.error(`❌ Error in chunk [${i + 1} - ${i + chunk.length}]:`, error.message);
    } else {
      successCount += chunk.length;
      const progressPercent = ((successCount / validRecords.length) * 100).toFixed(1);
      console.log(`✨ Progress: [${successCount} / ${validRecords.length}] (${progressPercent}%) users synced.`);
    }

    // Track highest HY ID to update counter
    chunk.forEach(user => {
      if (user.influencer_id && user.influencer_id.startsWith('HY')) {
        const num = parseInt(user.influencer_id.replace('HY', ''), 10);
        if (!isNaN(num) && num > maxNumericId) {
          maxNumericId = num;
        }
      }
    });
  }

  // Update counter sequence
  if (maxNumericId > 0) {
    console.log(`\n🔢 Updating influencer_id_counter to resume after HY${maxNumericId}...`);
    const { error: counterError } = await supabase
      .from('influencer_id_counter')
      .upsert({ id: 1, last_number: maxNumericId }, { onConflict: 'id' });
    
    if (counterError) {
      console.error("⚠️ Note: Counter update returned:", counterError.message);
    } else {
      console.log(`✅ Counter sequence updated to HY${maxNumericId}.`);
    }
  }

  console.log(`\n🎉 All done! Successfully synced ${successCount} creators into the database.`);
  console.log(`🔑 All users can now log in using password: '12345' (and change it later).`);
}

migrateUsers();
