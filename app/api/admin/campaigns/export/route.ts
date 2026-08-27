import { NextResponse } from 'next/server'
import { Client } from 'pg'
import { supabase } from '@/lib/supabase'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

// Helper to escape CSV values safely following RFC 4180
function escapeCSV(val: any): string {
  if (val === null || val === undefined) return '""'
  let str = String(val).trim()
  // Replace internal newlines with space or pipe to keep single-line rows clean
  str = str.replace(/\r\n|\r|\n/g, ' | ')
  // Escape quotes
  str = str.replace(/"/g, '""')
  return `"${str}"`
}

export async function GET(request: Request) {
  let client: Client | null = null

  try {
    const admin = await getAdminFromRequest()
    if (!admin || !hasModuleAccess(admin, 'campaigns')) {
      return NextResponse.json({ error: 'Unauthorized: Access to campaigns export is restricted' }, { status: 403 })
    }

    const { searchParams } = new URL(request.url)
    const exportType = searchParams.get('type') || 'campaigns' // 'campaigns' or 'applications'
    const campaignId = searchParams.get('campaign_id')
    const search = searchParams.get('search') || ''
    const status = searchParams.get('status') || ''

    if (!process.env.POSTGRES_URL) {
      return NextResponse.json({ error: 'Server configuration error: Database URL not found' }, { status: 500 })
    }

    client = new Client({
      connectionString: process.env.POSTGRES_URL,
      ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
    })
    await client.connect()

    // ─── Export Type 1: Campaigns Specifications (Bulk Upload Format) ───
    if (exportType === 'campaigns') {
      let query = `
        SELECT c.*, 
          (SELECT COUNT(*) FROM public.applications a WHERE a.campaign_id = c.id) as application_count
        FROM public.campaigns c
      `
      const params: any[] = []
      const whereClauses: string[] = []

      if (status && status !== 'All') {
        params.push(status)
        whereClauses.push(`c.status = $${params.length}`)
      }

      if (search) {
        params.push(`%${search}%`)
        whereClauses.push(`(c.brand_name ILIKE $${params.length} OR c.campaign_code ILIKE $${params.length} OR c.category ILIKE $${params.length})`)
      }

      if (whereClauses.length > 0) {
        query += ` WHERE ${whereClauses.join(' AND ')}`
      }

      query += ` ORDER BY COALESCE(c.display_order, 999999) ASC, c.created_at DESC`

      const result = await client.query(query, params)
      const campaigns = result.rows || []

      // Headers matching BulkCampaignUploadModal exactly so it can be re-imported
      const headers = [
        'campaign_code',
        'brand_name',
        'platform',
        'category',
        'budget_type',
        'budget_amount',
        'gender_required',
        'requirements',
        'deliverables',
        'location',
        'looking_for',
        'followers',
        'min_followers',
        'additional_info',
        'status',
        'is_live',
        'approval_status',
        'application_count',
        'created_at'
      ]

      const csvLines: string[] = [headers.map(h => escapeCSV(h)).join(',')]

      for (const c of campaigns) {
        const line = [
          escapeCSV(c.campaign_code),
          escapeCSV(c.brand_name),
          escapeCSV(c.platform),
          escapeCSV(c.category),
          escapeCSV(c.budget_type),
          escapeCSV(c.budget_amount || 0),
          escapeCSV(c.gender_required || 'Any'),
          escapeCSV(c.requirements),
          escapeCSV(c.deliverables),
          escapeCSV(c.location),
          escapeCSV(c.looking_for),
          escapeCSV(c.followers),
          escapeCSV(c.min_followers || ''),
          escapeCSV(c.additional_info),
          escapeCSV(c.status || 'Draft'),
          escapeCSV(c.is_live ? 'true' : 'false'),
          escapeCSV(c.approval_status || 'Approved'),
          escapeCSV(c.application_count || 0),
          escapeCSV(c.created_at ? new Date(c.created_at).toISOString() : '')
        ].join(',')
        csvLines.push(line)
      }

      const csvContent = '\uFEFF' + csvLines.join('\r\n')
      const fileName = `campaigns_export_${new Date().toISOString().slice(0, 10)}.csv`

      return new NextResponse(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${fileName}"`,
          'Cache-Control': 'no-store, no-cache, must-revalidate',
        },
      })
    }

    // ─── Export Type 2: Campaign Applications (Import Sync Format) ───
    let appsQuery = `
      SELECT 
        a.id as application_id,
        a.status as application_status,
        a.partial_payment,
        a.final_payment,
        a.pending_amount,
        a.manager_phone,
        a.selected_store,
        a.form_data,
        a.created_at as applied_at,
        u.id as user_id,
        u.full_name,
        u.influencer_id,
        u.email,
        u.mobile,
        u.instagram_username,
        u.followers,
        u.gender,
        u.state,
        u.city,
        u.category as user_category,
        u.shipping_addresses,
        c.campaign_code,
        c.brand_name,
        c.platform as campaign_platform,
        b.account_name,
        b.account_number,
        b.ifsc_code
      FROM public.applications a
      JOIN public.users u ON a.user_id = u.id
      JOIN public.campaigns c ON a.campaign_id = c.id
      LEFT JOIN public.bank_accounts b ON b.user_id = u.id
    `

    const appParams: any[] = []
    const appWheres: string[] = []

    if (campaignId) {
      appParams.push(campaignId)
      appWheres.push(`a.campaign_id = $${appParams.length}`)
    }

    if (status && status !== 'All') {
      appParams.push(status)
      appWheres.push(`a.status = $${appParams.length}`)
    }

    if (search) {
      appParams.push(`%${search}%`)
      appWheres.push(`(u.full_name ILIKE $${appParams.length} OR u.mobile ILIKE $${appParams.length} OR u.instagram_username ILIKE $${appParams.length} OR u.influencer_id ILIKE $${appParams.length} OR c.brand_name ILIKE $${appParams.length} OR c.campaign_code ILIKE $${appParams.length})`)
    }

    if (appWheres.length > 0) {
      appsQuery += ` WHERE ${appWheres.join(' AND ')}`
    }

    appsQuery += ` ORDER BY a.created_at DESC`

    const appsRes = await client.query(appsQuery, appParams)
    const applications = appsRes.rows || []

    // Collect all dynamic custom field keys across applications
    const customKeysSet = new Set<string>()
    applications.forEach(app => {
      if (app.form_data && typeof app.form_data === 'object') {
        Object.keys(app.form_data).forEach(k => {
          if (k && !k.startsWith('_')) customKeysSet.add(k)
        })
      }
    })
    const customKeys = Array.from(customKeysSet)

    // Standard headers mapping 100% 1:1 with /admin/import
    const baseHeaders = [
      'User ID',
      'Name',
      'Phone',
      'Email',
      'Instagram ID',
      'Followers',
      'Gender',
      'State',
      'City',
      'Category',
      'Status',
      'Campaign Code',
      'Brand Name',
      'Partial Payment',
      'Final Payment',
      'Pending Amount',
      'Manager Phone',
      'Account Name',
      'Account Number',
      'IFSC',
      'Store Location',
      'Shipping Address',
      'Applied Date'
    ]

    const allHeaders = [...baseHeaders, ...customKeys]
    const csvLines: string[] = [allHeaders.map(h => escapeCSV(h)).join(',')]

    for (const app of applications) {
      // Parse shipping address
      let shipStr = ''
      if (Array.isArray(app.shipping_addresses) && app.shipping_addresses.length > 0) {
        const addr = app.shipping_addresses[0]
        shipStr = [addr.address_line1, addr.address_line2, addr.landmark, addr.city, addr.state, addr.pincode].filter(Boolean).join(', ')
      }

      // Parse store location
      let storeStr = ''
      if (app.selected_store) {
        storeStr = typeof app.selected_store === 'object'
          ? [app.selected_store.name, app.selected_store.city, app.selected_store.area, app.selected_store.address].filter(Boolean).join(' - ')
          : String(app.selected_store)
      }

      const rowValues = [
        escapeCSV(app.influencer_id || ''),
        escapeCSV(app.full_name || ''),
        escapeCSV(app.mobile || ''),
        escapeCSV(app.email || ''),
        escapeCSV(app.instagram_username || ''),
        escapeCSV(app.followers || ''),
        escapeCSV(app.gender || ''),
        escapeCSV(app.state || ''),
        escapeCSV(app.city || ''),
        escapeCSV(app.user_category || ''),
        escapeCSV(app.application_status || 'Applied'),
        escapeCSV(app.campaign_code || ''),
        escapeCSV(app.brand_name || ''),
        escapeCSV(app.partial_payment || ''),
        escapeCSV(app.final_payment || ''),
        escapeCSV(app.pending_amount || ''),
        escapeCSV(app.manager_phone || ''),
        escapeCSV(app.account_name || ''),
        escapeCSV(app.account_number || ''),
        escapeCSV(app.ifsc_code || ''),
        escapeCSV(storeStr),
        escapeCSV(shipStr),
        escapeCSV(app.applied_at ? new Date(app.applied_at).toISOString() : '')
      ]

      // Append custom form answers
      for (const k of customKeys) {
        const val = app.form_data && app.form_data[k] !== undefined ? app.form_data[k] : ''
        rowValues.push(escapeCSV(typeof val === 'object' ? JSON.stringify(val) : val))
      }

      csvLines.push(rowValues.join(','))
    }

    const csvContent = '\uFEFF' + csvLines.join('\r\n')
    const fileName = campaignId && applications.length > 0 && applications[0].campaign_code
      ? `campaign_${applications[0].campaign_code}_applicants_${new Date().toISOString().slice(0, 10)}.csv`
      : `all_campaign_applicants_${new Date().toISOString().slice(0, 10)}.csv`

    return new NextResponse(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    })
  } catch (error: any) {
    console.error('API /admin/campaigns/export Error:', error)
    return NextResponse.json({ error: error.message || 'Internal server error' }, { status: 500 })
  } finally {
    if (client) {
      await client.end()
    }
  }
}
