import { NextResponse } from 'next/server'
import { generateBrandReviewToken } from '@/lib/brand-auth'

const BRAND_DEFAULTS: Record<string, { brand_id: string; brand_name: string; brand_slug: string; contact_name: string; contact_email: string }> = {
  mamaearth: {
    brand_id: 'b-mamaearth',
    brand_name: 'Mamaearth',
    brand_slug: 'mamaearth',
    contact_name: 'Ananya Sharma',
    contact_email: 'ananya@mamaearth.in',
  },
  plum: {
    brand_id: 'b-plum',
    brand_name: 'Plum Goodness',
    brand_slug: 'plum',
    contact_name: 'Rahul Sen',
    contact_email: 'rahul@plumgoodness.com',
  },
  plumgoodness: {
    brand_id: 'b-plum',
    brand_name: 'Plum Goodness',
    brand_slug: 'plum',
    contact_name: 'Rahul Sen',
    contact_email: 'rahul@plumgoodness.com',
  },
  sugar: {
    brand_id: 'b-sugar',
    brand_name: 'Sugar Cosmetics',
    brand_slug: 'sugar',
    contact_name: 'Kavita Roy',
    contact_email: 'kavita@sugarcosmetics.com',
  },
  sugarcosmetics: {
    brand_id: 'b-sugar',
    brand_name: 'Sugar Cosmetics',
    brand_slug: 'sugar',
    contact_name: 'Kavita Roy',
    contact_email: 'kavita@sugarcosmetics.com',
  },
}

export async function POST(request: Request) {
  try {
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
    } = body

    // 1. Resolve Brand Information
    const slugKey = (brand_slug || brand_name || 'mamaearth').toLowerCase().replace(/[^a-z0-9]/g, '')
    const matchedDefault = BRAND_DEFAULTS[slugKey] || BRAND_DEFAULTS.mamaearth

    const resolvedBrandId = brand_id || matchedDefault.brand_id
    const resolvedBrandName = brand_name || matchedDefault.brand_name
    const resolvedBrandSlug = brand_slug || matchedDefault.brand_slug
    const resolvedContactName = contact_name || matchedDefault.contact_name
    const resolvedContactEmail = contact_email || matchedDefault.contact_email

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
      },
      '14d'
    )

    // 3. Resolve Host & Protocol
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const baseUrl = process.env.NEXT_PUBLIC_BRAND_PORTAL_URL || (host.includes('1to7') ? 'https://brand.thehype.in' : `${protocol}://${host}`)

    const queryParams = new URLSearchParams()
    queryParams.set('token', token)
    if (batch_name) {
      queryParams.set('batch', batch_name)
    }

    const reviewUrl = `${baseUrl}/brand/review?${queryParams.toString()}`

    // 4. Construct Formatted WhatsApp & Email Templates
    const countText = creator_count ? `${creator_count} shortlisted creators` : 'curated creator roster'
    const campaignText = campaign_title || batch_name || 'Diwali Campaign'

    const whatsappMessage = `Hi ${resolvedContactName}! 👋\n\nTheHype has prepared your *${countText}* for the *${resolvedBrandName} (${campaignText})*.\n\n⚡ *1-Tap Direct Review Link:*\n${reviewUrl}\n\n• Zero password required\n• Review profile analytics & commercial quotations\n• Instant 1-tap creator approval & dispatch\n\n_Valid for 14 days._`

    const emailSubject = `[TheHype Roster] Review & Approve Creators for ${resolvedBrandName} - ${campaignText}`
    const emailBody = `Hi ${resolvedContactName},\n\nOur curation team at TheHype has shortlisted ${countText} for ${resolvedBrandName}.\n\nYou can review full Instagram metrics, commercial quotations, and approve creators directly using this secure link:\n${reviewUrl}\n\nBest regards,\nTheHype Campaign Operations`

    return NextResponse.json({
      success: true,
      url: reviewUrl,
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
