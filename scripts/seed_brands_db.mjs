import pg from 'pg'
import fs from 'fs'
import bcrypt from 'bcryptjs'

const { Pool } = pg

const env = fs.readFileSync('.env.local', 'utf8')
const match = env.match(/POSTGRES_URL=([^\r\n]+)/)
if (!match) {
  console.error('No POSTGRES_URL found in .env.local')
  process.exit(1)
}

const pool = new Pool({
  connectionString: match[1],
  ssl: { rejectUnauthorized: false },
})

async function seed() {
  const client = await pool.connect()
  try {
    console.log('Seeding client brands directly into PostgreSQL...')

    // 1. Fetch available admins to assign as real KAMs
    const adminsRes = await client.query(`
      SELECT id, name, email, COALESCE(brand_admin_role, 'viewer') as brand_admin_role
      FROM public.admins
      ORDER BY 
        CASE 
          WHEN brand_admin_role = 'brand_superadmin' THEN 0 
          WHEN brand_admin_role = 'kam_lead' THEN 1
          WHEN brand_admin_role = 'brand_ops' THEN 2
          ELSE 3
        END,
        name ASC
    `)

    const admins = adminsRes.rows
    console.log(`Found ${admins.length} admins in database.`)

    const superAdmin = admins.find(a => a.email === 'superadmin@gmail.com') || admins[0]
    const kamLead = admins.find(a => a.brand_admin_role === 'kam_lead') || superAdmin
    const brandOps = admins.find(a => a.brand_admin_role === 'brand_ops') || superAdmin

    const defaultPasswordHash = await bcrypt.hash('brand123', 10)

    const SEED_BRANDS = [
      {
        name: 'Mamaearth',
        slug: 'mamaearth',
        industry: 'Beauty & Skincare',
        primaryContactName: 'Ananya Sharma (Brand Head)',
        primaryContactEmail: 'ananya@mamaearth.in',
        loginEmails: ['ananya@mamaearth.in', 'demo@mamaearth.in'],
        phone: '+91 98765 43210',
        assignedKamId: kamLead?.id || superAdmin?.id,
      },
      {
        name: 'Plum Goodness',
        slug: 'plum-goodness',
        industry: '100% Vegan Beauty',
        primaryContactName: 'Rahul Sen (Marketing Lead)',
        primaryContactEmail: 'rahul@plumgoodness.com',
        loginEmails: ['rahul@plumgoodness.com', 'demo@plumgoodness.in'],
        phone: '+91 98111 22334',
        assignedKamId: brandOps?.id || superAdmin?.id,
      },
      {
        name: 'Sugar Cosmetics',
        slug: 'sugar-cosmetics',
        industry: 'Color Cosmetics',
        primaryContactName: 'Kavita Roy (Digital Lead)',
        primaryContactEmail: 'kavita@sugarcosmetics.com',
        loginEmails: ['kavita@sugarcosmetics.com', 'demo@sugarcosmetics.in'],
        phone: '+91 98222 33445',
        assignedKamId: superAdmin?.id,
      },
      {
        name: 'Minimalist Skincare',
        slug: 'minimalist-skincare',
        industry: 'Active Skincare',
        primaryContactName: 'Mohit Yadav (Brand Director)',
        primaryContactEmail: 'contact@beminimalist.co',
        loginEmails: ['contact@beminimalist.co'],
        phone: '+91 99887 76655',
        assignedKamId: kamLead?.id || superAdmin?.id,
      },
    ]

    for (const b of SEED_BRANDS) {
      // Upsert Brand
      const brandRes = await client.query(
        `INSERT INTO public.brands (
          name, slug, industry, primary_contact_name, primary_contact_email,
          primary_contact_phone, assigned_1to7_kam_id, is_active
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, true)
        ON CONFLICT (slug) DO UPDATE SET
          name = EXCLUDED.name,
          industry = EXCLUDED.industry,
          primary_contact_name = EXCLUDED.primary_contact_name,
          primary_contact_email = EXCLUDED.primary_contact_email,
          primary_contact_phone = EXCLUDED.primary_contact_phone,
          assigned_1to7_kam_id = EXCLUDED.assigned_1to7_kam_id,
          is_active = true
        RETURNING id, name, slug`,
        [
          b.name,
          b.slug,
          b.industry,
          b.primaryContactName,
          b.primaryContactEmail,
          b.phone,
          b.assignedKamId,
        ]
      )

      const brandId = brandRes.rows[0].id
      console.log(`Seeded brand: ${b.name} (id: ${brandId})`)

      // Upsert Brand Users
      for (const email of b.loginEmails) {
        await client.query(
          `INSERT INTO public.brand_users (
            brand_id, email, password_hash, full_name, phone, role, is_active
          ) VALUES ($1, $2, $3, $4, $5, 'owner', true)
          ON CONFLICT (email) DO UPDATE SET
            brand_id = EXCLUDED.brand_id,
            password_hash = EXCLUDED.password_hash,
            full_name = EXCLUDED.full_name,
            phone = EXCLUDED.phone,
            is_active = true`,
          [
            brandId,
            email.toLowerCase(),
            defaultPasswordHash,
            b.primaryContactName,
            b.phone,
          ]
        )
        console.log(`  - Linked user: ${email} (Password: brand123)`)
      }
    }

    console.log('✅ All sample brands and brand users seeded successfully!')
  } catch (err) {
    console.error('Error during seeding:', err)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
