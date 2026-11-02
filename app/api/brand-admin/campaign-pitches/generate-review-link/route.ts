import { NextResponse } from 'next/server'
import { generateBrandReviewToken } from '@/lib/brand-auth'
import pool, { ensurePocMigration } from '@/lib/db'

export async function POST(request: Request) {
  try {
    await ensurePocMigration()

    const body = await request.json()
    const {
      brand_id,
      brand_name,
      brand_slug,
      batch_name,
      campaign_id,
      campaign_title,
      contact_name,
      contact_email,
      creator_count,
      target_page,
      destination,
    } = body

    const selectedTargetPage = (target_page || destination || 'auto').toLowerCase().trim()

    // 1. Dynamically Resolve Brand Information from PostgreSQL Database
    let dbBrand: any = null
    if (brand_id) {
      try {
        const res = await pool.query(
          `SELECT id, name, slug, primary_contact_name, primary_contact_email 
           FROM public.brands 
           WHERE id::text = $1 OR slug = $1 LIMIT 1`,
          [brand_id]
        )
        if (res.rows.length > 0) dbBrand = res.rows[0]
      } catch {
        // Fall through
      }
    }

    if (!dbBrand && (brand_name || brand_slug)) {
      const searchKey = (brand_slug || brand_name || '').trim()
      try {
        const res = await pool.query(
          `SELECT id, name, slug, primary_contact_name, primary_contact_email 
           FROM public.brands 
           WHERE LOWER(TRIM(name)) = LOWER(TRIM($1)) 
              OR LOWER(TRIM(slug)) = LOWER(TRIM($1)) 
              OR slug ILIKE $2 
           LIMIT 1`,
          [searchKey, `${searchKey}%`]
        )
        if (res.rows.length > 0) dbBrand = res.rows[0]
      } catch {
        // Fall through
      }
    }

    const resolvedBrandName = (brand_name || dbBrand?.name || 'Brand Partner').trim()
    const fallbackSlug = resolvedBrandName.toLowerCase().replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '') || 'brand'
    const resolvedBrandSlug = (brand_slug || dbBrand?.slug || fallbackSlug).trim()
    const resolvedBrandId = brand_id || dbBrand?.id || `b-${resolvedBrandSlug}`
    const resolvedContactName = (contact_name || dbBrand?.primary_contact_name || `${resolvedBrandName} Team`).trim()
    const resolvedContactEmail = (contact_email || dbBrand?.primary_contact_email || `contact@${resolvedBrandSlug}.com`).trim()

    // 2. Generate Signed JWT Token (Valid for 14 Days)
    const token = await generateBrandReviewToken(
      {
        brand_id: resolvedBrandId,
        brand_name: resolvedBrandName,
        brand_slug: resolvedBrandSlug,
        email: resolvedContactEmail,
        full_name: resolvedContactName,
        role: 'reviewer',
        campaign_id: campaign_id || undefined,
        batch_name: batch_name || undefined,
        token_type: 'pitch_review',
        target_page: selectedTargetPage,
        destination:
          selectedTargetPage === 'dispatch'
            ? '/brand/dispatch'
            : selectedTargetPage === 'creators'
              ? '/brand/campaigns'
              : selectedTargetPage === 'sample_rosters'
                ? '/brand/sample-rosters'
                : undefined,
      },
      '14d'
    )

    // 3. Resolve Host & Protocol
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const baseUrl = process.env.NEXT_PUBLIC_BRAND_PORTAL_URL || (host.includes('1to7') ? 'https://brand.thehype.in' : `${protocol}://${host}`)

    // 4. Generate Branded Short Link (Stored in DB)
    const cleanBrandSlug = (resolvedBrandName || resolvedBrandSlug || 'brand')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 15) || 'brand'

    const randomSuffix = Math.random().toString(36).substring(2, 6)
    const shortCode = `${cleanBrandSlug}-${randomSuffix}`
    let reviewUrl = `${baseUrl}/r/${shortCode}`

    try {
      await ensurePocMigration()
      const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days
      await pool.query(
        `INSERT INTO public.brand_magic_links 
          (code, brand_id, brand_name, brand_slug, contact_name, contact_email, target_page, destination, batch_name, campaign_id, token, expires_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         ON CONFLICT (code) DO UPDATE 
         SET token = EXCLUDED.token, expires_at = EXCLUDED.expires_at, updated_at = NOW()`,
        [
          shortCode,
          resolvedBrandId,
          resolvedBrandName,
          resolvedBrandSlug,
          resolvedContactName,
          resolvedContactEmail,
          selectedTargetPage,
          selectedTargetPage === 'dispatch'
            ? '/brand/dispatch'
            : selectedTargetPage === 'creators'
              ? '/brand/campaigns'
              : selectedTargetPage === 'sample_rosters'
                ? '/brand/sample-rosters'
                : null,
          batch_name || null,
          campaign_id || null,
          token,
          expiresAt,
        ]
      )
    } catch (dbErr) {
      console.warn('[Magic Link] DB persist error, falling back to query token URL:', dbErr)
      const queryParams = new URLSearchParams()
      queryParams.set('token', token)
      if (batch_name) queryParams.set('batch', batch_name)
      if (selectedTargetPage) queryParams.set('dest', selectedTargetPage)
      reviewUrl = `${baseUrl}/brand/review?${queryParams.toString()}`
    }

    // 5. Construct Formatted WhatsApp & Email Templates tailored to the target destination
    const countText = creator_count ? `${creator_count} shortlisted creators` : 'curated creator roster'
    const campaignText = campaign_title || batch_name || 'Campaign'

    let whatsappMessage = ''
    let emailSubject = ''
    let emailBody = ''

    if (selectedTargetPage === 'dispatch') {
      whatsappMessage = `Hi ${resolvedContactName}! 👋\n\nTheHype has published your live *Product Dispatch & Courier Manifest* for *${resolvedBrandName}*.\n\n⚡ *1-Tap Courier Manifest Link:*\n${reviewUrl}\n\n• Zero password required\n• Full delivery addresses, pincodes & contact phones\n• Real-time warehouse AWB tracking & 1-click Shiprocket/Delhivery CSV export\n\n_Valid for 14 days._`
      emailSubject = `[TheHype Dispatch] Live Product Courier Manifest for ${resolvedBrandName}`
      emailBody = `Hi ${resolvedContactName},\n\nThe verified shipping addresses and courier manifest for ${resolvedBrandName} are now ready for sample product dispatch.\n\nAccess your live courier sheet directly here:\n${reviewUrl}\n\nBest regards,\nTheHype Logistics & Operations`
    } else if (selectedTargetPage === 'creators') {
      whatsappMessage = `Hi ${resolvedContactName}! 👋\n\nTheHype has prepared your *${countText}* for the *${resolvedBrandName} (${campaignText})*.\n\n⚡ *1-Tap Direct Review Link:*\n${reviewUrl}\n\n• Zero password required\n• Review profile analytics & commercial quotations\n• Instant 1-tap creator approval\n\n_Valid for 14 days._`
      emailSubject = `[TheHype Curation] Review & Approve Creators for ${resolvedBrandName} - ${campaignText}`
      emailBody = `Hi ${resolvedContactName},\n\nOur curation team at TheHype has shortlisted ${countText} for ${resolvedBrandName}.\n\nYou can review full Instagram metrics, commercial quotations, and approve creators directly using this secure link:\n${reviewUrl}\n\nBest regards,\nTheHype Campaign Operations`
    } else if (selectedTargetPage === 'sample_rosters') {
      whatsappMessage = `Hi ${resolvedContactName}! 👋\n\nTheHype has prepared your curated *Sample Pitch Decks* for *${resolvedBrandName}*.\n\n⚡ *1-Tap Pitch Decks Link:*\n${reviewUrl}\n\n• Zero password required\n• Curated sample profiles, aesthetics & engagement metrics\n\n_Valid for 14 days._`
      emailSubject = `[TheHype Pitch Deck] Sample Creator Roster for ${resolvedBrandName}`
      emailBody = `Hi ${resolvedContactName},\n\nExplore our curated sample creator roster and presentation pitch decks for ${resolvedBrandName} here:\n${reviewUrl}\n\nBest regards,\nTheHype Talent Team`
    } else {
      // Smart Auto / General Access
      whatsappMessage = `Hi ${resolvedContactName}! 👋\n\nHere is your official 1-Click access link to the *${resolvedBrandName}* Workspace on TheHype:\n\n⚡ *1-Tap Direct Portal Link:*\n${reviewUrl}\n\n• Zero password required\n• Live creator shortlists, approvals & courier dispatch manifests\n\n_Valid for 14 days._`
      emailSubject = `[TheHype Portal] Direct 1-Click Access for ${resolvedBrandName}`
      emailBody = `Hi ${resolvedContactName},\n\nAccess your live ${resolvedBrandName} brand workspace directly using this 1-click authentication link:\n${reviewUrl}\n\nBest regards,\nTheHype Team`
    }

    return NextResponse.json({
      success: true,
      url: reviewUrl,
      shortCode,
      token,
      brand_name: resolvedBrandName,
      contact_name: resolvedContactName,
      batch_name: batch_name || null,
      whatsappMessage,
      emailSubject,
      emailBody,
      expiresIn: '14 days',
    })
  } catch (error: any) {
    console.error('Generate Review Link API Error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate review link' },
      { status: 500 }
    )
  }
}
