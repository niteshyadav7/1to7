const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');

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
const supabaseKey = envVars['NEXT_PUBLIC_SUPABASE_ANON_KEY']; 

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing SUPABASE URL or KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// 2. Setup Default Password
const plainPassword = 'Welcome@1to7';
// Pre-calculate hash so we don't do it 20,000 times
const salt = bcrypt.genSaltSync(10);
const defaultPasswordHash = bcrypt.hashSync(plainPassword, salt);

// Very basic CSV parser that handles basic quotes
function parseCSV(text) {
  const lines = text.split('\n');
  const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
  const results = [];

  for (let i = 1; i < lines.length; i++) {
    if (!lines[i].trim()) continue;
    // Regex matches commas outside of quotes
    const regex = /,(?=(?:(?:[^"]*"){2})*[^"]*$)/;
    const values = lines[i].split(regex).map(v => v.trim().replace(/^"|"$/g, ''));
    
    let obj = {};
    headers.forEach((header, index) => {
      obj[header] = values[index] || null;
    });
    results.push(obj);
  }
  return results;
}

// Ensure the CSV header exact matches your column names
function mapToDatabaseSchema(csvRow) {
  // If the cell is empty or 'undefined', map it to null
  const clean = (val) => val && val.trim() ? val.trim() : null;
  const mobile = clean(csvRow['Phone']);

  // Extract pure ID from instagram link if needed
  let insta = clean(csvRow['Instagram ID']);
  if (insta && insta.includes('instagram.com/')) {
    // try to get just the username
    const match = insta.match(/instagram\.com\/([^/?]+)/);
    if (match && match[1]) insta = match[1];
  }

  // A valid user must at least have a mobile to avoid blank records
  if (!mobile) return null;

  return {
    full_name: clean(csvRow['Name']) || 'Unknown',
    mobile: mobile,
    email: clean(csvRow['Email']) || `${mobile}@1to7.com`, // Fallback since email is unique and required normally
    influencer_id: clean(csvRow['User ID']) || null, 
    instagram_username: insta,
    gender: clean(csvRow['Gender']) === 'M' || clean(csvRow['Gender']) === 'Male' ? 'Male' : (clean(csvRow['Gender']) === 'F' || clean(csvRow['Gender']) === 'Female' ? 'Female' : 'Any'), // Default mapping
    account_number: clean(csvRow['Account Number']),
    account_name: clean(csvRow['Account Name']),
    ifsc_code: clean(csvRow['IFSC']),
    state: clean(csvRow['State']),
    city: clean(csvRow['City']),
    followers: clean(csvRow['Followers']) ? parseInt(clean(csvRow['Followers'])) : 0,
    category: clean(csvRow['Category']),
    password_hash: defaultPasswordHash,
    is_email_verified: true,
    is_mobile_verified: true
  };
}

async function migrateUsers() {
  const filePath = 'users.csv';
  
  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: Please put the Google Sheet CSV export in the same folder and name it '${filePath}'`);
    process.exit(1);
  }

  console.log("Reading CSV...");
  const fileContent = fs.readFileSync(filePath, 'utf8');
  const rawData = parseCSV(fileContent);
  
  console.log(`Found ${rawData.length} rows. Processing mapping...`);

  const supabaseRecords = rawData
    .map(mapToDatabaseSchema)
    .filter(record => record !== null); // Remove blanks

  console.log(`Prepared ${supabaseRecords.length} valid records for database insertion.`);

  // Insert in chunks of 500
  const CHUNK_SIZE = 500;
  let successCount = 0;
  let maxNumericId = 0;

  for (let i = 0; i < supabaseRecords.length; i += CHUNK_SIZE) {
    const chunk = supabaseRecords.slice(i, i + CHUNK_SIZE);
    
    // Attempt insertion using upsert to avoid duplicate Key errors breaking the whole batch
    const { data, error } = await supabase
      .from('users')
      .upsert(chunk, { onConflict: 'mobile' }); // If mobile exists, it updates.

    if (error) {
      console.error(`Error inserting chunk ${i} - ${i + CHUNK_SIZE}:`, error.message);
      console.error("Make sure your RLS policies allow you to insert/upsert, or use the service_role key.");
    } else {
      successCount += chunk.length;
      console.log(`Successfully migrated ${successCount}/${supabaseRecords.length} users.`);
    }

    // Extract numbers to update the sequence counter for future users
    chunk.forEach(user => {
      if (user.influencer_id && user.influencer_id.startsWith('HY')) {
        const num = parseInt(user.influencer_id.replace('HY', ''), 10);
        if (!isNaN(num) && num > maxNumericId) {
          maxNumericId = num;
        }
      }
    });
  }

  // Update counter so newly signed up users don't get overlapping IDs
  if (maxNumericId > 0) {
    console.log(`Updating influencer_id_counter to start new users after HY${maxNumericId}...`);
    // Manually updating logic
    const { error: counterError } = await supabase
      .from('influencer_id_counter')
      .upsert({ id: 1, last_number: maxNumericId }, { onConflict: 'id' });
    
    if(counterError){
        console.error("Error updating counter:", counterError);
    } else {
        console.log(`Counter updated successfully!`);
    }
  }

  console.log("Migration complete!");
}

migrateUsers();
