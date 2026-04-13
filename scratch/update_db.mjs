import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://zqnedwjtppydkslhtbay.supabase.co'
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_ZQEDls74CS59iHPavdlf8g_BFFjFc-7'

const supabase = createClient(supabaseUrl, supabaseKey)

// Expert Business Setup for Influencer E-commerce Campaigns!
// These fields cover fraud-prevention (Payment screenshots, review profiles) and accurate tracking.
const DEFAULT_ORDER_FIELDS = [
  { name: 'Order ID', type: 'text', required: true },
  { name: 'Order Date (DD-MM-YYYY)', type: 'text', required: true },
  { name: 'Product Amount (₹)', type: 'number', required: true },
  { name: 'Reviewer Name', type: 'text', required: true },
  { name: 'Reviewer Profile Link', type: 'text', required: true },
  { name: 'Order Placement Screenshot', type: 'image', required: true },
  { name: 'Payment Proof Screenshot (UPI/Bank)', type: 'image', required: true }
]

async function updateDB() {
  console.log('Fetching campaigns with order_form = true...')
  const { data: campaigns, error } = await supabase
    .from('campaigns')
    .select('id, brand_name, order_form_fields')
    .eq('order_form', true)

  if (error) {
    console.error('Error fetching campaigns:', error)
    return
  }

  console.log(`Found ${campaigns?.length || 0} campaigns.`)

  for (const campaign of campaigns || []) {
    console.log(`Updating campaign: ${campaign.brand_name} (${campaign.id})`)
    const { error: updateError } = await supabase
      .from('campaigns')
      .update({ order_form_fields: DEFAULT_ORDER_FIELDS })
      .eq('id', campaign.id)
    
    if (updateError) {
      console.error(`Failed to update ${campaign.id}:`, updateError)
    } else {
      console.log(`Successfully updated ${campaign.brand_name}`)
    }
  }

  console.log('Database base fields update complete.')
}

updateDB()
