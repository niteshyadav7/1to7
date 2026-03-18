const fs = require('fs');

const BRANDS = [
  'Nike', 'Spotify India', 'Mamaearth', 'boAt Lifestyle', 
  'Zomato', 'Nykaa', 'Flipkart', 'Sugar Cosmetics', 
  'Plum Goodness', 'Swiggy', 'Minimalist', 'Cult.fit', 
  'Lenskart', 'WOW Skin Science', 'Myntra'
];
const CATEGORIES = ['Beauty & Fashion', 'Tech & Gadgets', 'Food & Beverage', 'Lifestyle', 'Health & Fitness', 'Travel', 'Entertainment'];
const PLATFORMS = ['Instagram', 'YouTube', 'Amazon'];
const BUDGET_TYPES = ['Paid', 'Barter', 'Hybrid'];
const GENDERS = ['Any', 'Male', 'Female'];
const STATUSES = ['Active', 'Draft', 'Closed', 'Review'];

const LOCATIONS = ['PAN India', 'Mumbai', 'Delhi NCR', 'Bangalore', 'Tier 1 Cities'];
const LOOKING_FOR = ['Fashion & Lifestyle Creators', 'Tech Reviewers', 'Food Vloggers', 'Meme Pages', 'UGC Creators'];
const FOLLOWERS = ['Above 5k', '10k+', 'No restriction', '50k - 100k', 'Micro-influencers (1k-10k)'];
const ADDITIONAL_INFO = [
  'Product Reimbursement in 1-2 days', 
  'Must be able to shoot in 4K', 
  'Need fast turnaround time (48 hrs)', 
  'Open to long-term ambassadorship', 
  ''
];

const DELIVERABLES = [
  '1 Reel + 2 Stories with Swipe Up link',
  '1 Dedicated Video (5-8 mins)',
  '3 High-Quality Static Posts',
  '1 YouTube Short + Community Post',
  'Product Review + Unboxing Video'
];

function getRandomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateRandomCampaign() {
  const brand = getRandomItem(BRANDS);
  const category = getRandomItem(CATEGORIES);
  const platform = getRandomItem(PLATFORMS);
  
  // Future dates
  const futureDate = new Date();
  futureDate.setDate(futureDate.getDate() + Math.floor(Math.random() * 30) + 1);
  const dateStr = futureDate.toISOString().split('T')[0];
  
  // Optional form link
  const formLink = Math.random() > 0.7 ? `https://forms.gle/${Date.now()}` : '';

  return `('${'CMP' + Math.floor(Math.random() * 10000000)}', '${brand}', '${category}', '${platform}', '${getRandomItem(BUDGET_TYPES)}', '${getRandomItem(DELIVERABLES)}', ARRAY[]::text[], 'Collaborate with ${brand} to promote our new line. Need engaging content focused on ${category.toLowerCase()} audience.', '${getRandomItem(GENDERS)}', ${Math.random() > 0.5 ? 'true' : 'false'}, '${getRandomItem(STATUSES)}', '${getRandomItem(LOCATIONS)}', '${getRandomItem(LOOKING_FOR)}', '${getRandomItem(FOLLOWERS)}', '${getRandomItem(ADDITIONAL_INFO)}', '${dateStr}', '${formLink}')`;
}

let sql = `INSERT INTO public.campaigns (campaign_code, brand_name, category, platform, budget_type, deliverables, product_links, requirements, gender_required, is_live, status, location, looking_for, followers, additional_info, collab_date, form_link) VALUES\n`;

const rows = [];
for (let i = 0; i < 50; i++) {
  rows.push(generateRandomCampaign());
}

sql += rows.join(',\n') + ';';

fs.writeFileSync('updated_dummy_campaigns.sql', sql);
console.log('SQL generated successfully context: updated_dummy_campaigns.sql');
