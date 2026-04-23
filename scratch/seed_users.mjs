import { createClient } from '@supabase/supabase-js'
import 'dotenv/config' // or load env vars manually if running directly

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL'
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY'

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase URL or Service Role Key")
  process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseKey)

// The secure hash for test@123
const DEFAULT_PASSWORD_HASH = '$2b$10$vysFdPLELlPEvtXf1B5kneSq1OV0iEtxOUlf4LpwKfGXmenL1jUpm'

const mockUsers = [
  { influencer_id: 'HY80001', full_name: 'Aman Sharma', mobile: '8000000001', email: 'aman@test.com', instagram_username: 'https://instagram.com/aman', followers: 50000, gender: 'Male', state: 'Delhi', city: 'New Delhi', category: 'Tech', account_name: 'Aman Sharma', account_number: '100020003000', ifsc_code: 'HDFC0001234', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80002', full_name: 'Neha Singh', mobile: '8000000002', email: 'neha@test.com', instagram_username: 'https://instagram.com/neha_creates', followers: 120000, gender: 'Female', state: 'Maharashtra', city: 'Mumbai', category: 'Fashion', account_name: 'Neha Singh', account_number: '100020003001', ifsc_code: 'SBIN0001234', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80003', full_name: 'Rahul Verma', mobile: '8000000003', email: 'rahul@test.com', instagram_username: 'https://instagram.com/rahul_vlogs', followers: 8000, gender: 'Male', state: 'Karnataka', city: 'Bangalore', category: 'Travel', account_name: 'Rahul Verma', account_number: '100020003002', ifsc_code: 'ICIC0001234', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80004', full_name: 'Priya Patel', mobile: '8000000004', email: 'priya.p@test.com', instagram_username: 'https://instagram.com/priyapatel_official', followers: 25000, gender: 'Female', state: 'Gujarat', city: 'Ahmedabad', category: 'Beauty', account_name: 'Priya Patel', account_number: '100020003003', ifsc_code: 'AXIS0001234', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80005', full_name: 'Vikram Singh', mobile: '8000000005', email: 'vikram.s@test.com', instagram_username: 'https://instagram.com/vikram_fitness', followers: 75000, gender: 'Male', state: 'Rajasthan', city: 'Jaipur', category: 'Fitness', account_name: 'Vikram Singh', account_number: '100020003004', ifsc_code: 'PUNB0001234', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80006', full_name: 'Sneha Reddy', mobile: '8000000006', email: 'sneha.r@test.com', instagram_username: 'https://instagram.com/sneha_fashion', followers: 150000, gender: 'Female', state: 'Telangana', city: 'Hyderabad', category: 'Fashion', account_name: 'Sneha Reddy', account_number: '100020003005', ifsc_code: 'KKBK0001234', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80007', full_name: 'Amit Kumar', mobile: '8000000007', email: 'amit.k@test.com', instagram_username: 'https://instagram.com/amit_tech', followers: 30000, gender: 'Male', state: 'Haryana', city: 'Gurgaon', category: 'Tech', account_name: 'Amit Kumar', account_number: '100020003006', ifsc_code: 'HDFC0001235', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80008', full_name: 'Kavita Gupta', mobile: '8000000008', email: 'kavita.g@test.com', instagram_username: 'https://instagram.com/kavita_lifestyle', followers: 45000, gender: 'Female', state: 'Uttar Pradesh', city: 'Lucknow', category: 'Lifestyle', account_name: 'Kavita Gupta', account_number: '100020003007', ifsc_code: 'SBIN0001235', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80009', full_name: 'Rohan Desai', mobile: '8000000009', email: 'rohan.d@test.com', instagram_username: 'https://instagram.com/rohan_travels', followers: 90000, gender: 'Male', state: 'Maharashtra', city: 'Pune', category: 'Travel', account_name: 'Rohan Desai', account_number: '100020003008', ifsc_code: 'ICIC0001235', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80010', full_name: 'Anjali Joshi', mobile: '8000000010', email: 'anjali.j@test.com', instagram_username: 'https://instagram.com/anjali_art', followers: 15000, gender: 'Female', state: 'Madhya Pradesh', city: 'Indore', category: 'Art', account_name: 'Anjali Joshi', account_number: '100020003009', ifsc_code: 'AXIS0001235', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80011', full_name: 'Karan Malhotra', mobile: '8000000011', email: 'karan.m@test.com', instagram_username: 'https://instagram.com/karan_moto', followers: 200000, gender: 'Male', state: 'Punjab', city: 'Chandigarh', category: 'Automotive', account_name: 'Karan Malhotra', account_number: '100020003010', ifsc_code: 'PUNB0001235', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80012', full_name: 'Shruti Iyer', mobile: '8000000012', email: 'shruti.i@test.com', instagram_username: 'https://instagram.com/shruti_dance', followers: 60000, gender: 'Female', state: 'Tamil Nadu', city: 'Chennai', category: 'Entertainment', account_name: 'Shruti Iyer', account_number: '100020003011', ifsc_code: 'KKBK0001235', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80013', full_name: 'Nitin Das', mobile: '8000000013', email: 'nitin.d@test.com', instagram_username: 'https://instagram.com/nitin_foodie', followers: 85000, gender: 'Male', state: 'West Bengal', city: 'Kolkata', category: 'Food', account_name: 'Nitin Das', account_number: '100020003012', ifsc_code: 'HDFC0001236', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80014', full_name: 'Pooja Nair', mobile: '8000000014', email: 'pooja.n@test.com', instagram_username: 'https://instagram.com/pooja_beauty', followers: 110000, gender: 'Female', state: 'Kerala', city: 'Kochi', category: 'Beauty', account_name: 'Pooja Nair', account_number: '100020003013', ifsc_code: 'SBIN0001236', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80015', full_name: 'Sanjay Rao', mobile: '8000000015', email: 'sanjay.r@test.com', instagram_username: 'https://instagram.com/sanjay_gaming', followers: 40000, gender: 'Male', state: 'Karnataka', city: 'Mysore', category: 'Gaming', account_name: 'Sanjay Rao', account_number: '100020003014', ifsc_code: 'ICIC0001236', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80016', full_name: 'Megha Kapoor', mobile: '8000000016', email: 'megha.k@test.com', instagram_username: 'https://instagram.com/megha_styles', followers: 95000, gender: 'Female', state: 'Delhi', city: 'New Delhi', category: 'Fashion', account_name: 'Megha Kapoor', account_number: '100020003015', ifsc_code: 'AXIS0001236', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80017', full_name: 'Arjun Nair', mobile: '8000000017', email: 'arjun.n@test.com', instagram_username: 'https://instagram.com/arjun_photography', followers: 130000, gender: 'Male', state: 'Kerala', city: 'Trivandrum', category: 'Photography', account_name: 'Arjun Nair', account_number: '100020003016', ifsc_code: 'PUNB0001236', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80018', full_name: 'Swati Mishra', mobile: '8000000018', email: 'swati.m@test.com', instagram_username: 'https://instagram.com/swati_cooks', followers: 22000, gender: 'Female', state: 'Uttar Pradesh', city: 'Kanpur', category: 'Food', account_name: 'Swati Mishra', account_number: '100020003017', ifsc_code: 'KKBK0001236', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80019', full_name: 'Devendra Yadav', mobile: '8000000019', email: 'dev.y@test.com', instagram_username: 'https://instagram.com/dev_fitness', followers: 55000, gender: 'Male', state: 'Haryana', city: 'Faridabad', category: 'Fitness', account_name: 'Devendra Yadav', account_number: '100020003018', ifsc_code: 'HDFC0001237', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true },
  { influencer_id: 'HY80020', full_name: 'Ritika Sen', mobile: '8000000020', email: 'ritika.s@test.com', instagram_username: 'https://instagram.com/ritika_daily', followers: 70000, gender: 'Female', state: 'West Bengal', city: 'Howrah', category: 'Lifestyle', account_name: 'Ritika Sen', account_number: '100020003019', ifsc_code: 'SBIN0001237', password_hash: DEFAULT_PASSWORD_HASH, is_mobile_verified: true }
]

async function seedUsers() {
  console.log('Seeding 20 detailed users into the database...')
  let successCount = 0
  let errorCount = 0

  for (const user of mockUsers) {
    const { error } = await supabase.from('users').upsert([user], { onConflict: 'mobile' })
    if (error) {
      console.error(`Error inserting ${user.full_name}:`, error.message)
      errorCount++
    } else {
      successCount++
    }
  }

  console.log(`\nDone! Successfully seeded ${successCount} users. Errors: ${errorCount}`)
}

seedUsers()
