import { NextRequest, NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getAdminFromRequest, hasModuleAccess } from '@/lib/admin-auth'

export const dynamic = 'force-dynamic'

export interface CampaignCreatorDetail {
  applicationId: string
  userId: string
  creatorName: string
  instagramUsername: string | null
  profilePic: string | null
  followers: number
  mobile: string | null
  city: string | null
  status: string
  appliedAt: string
  teamRemark: string | null
  teamRemarkBy: string | null
  teamRemarkUpdatedAt: string | null
  paymentAmount: number | null
  partialPayment: number
  finalPayment: number
  completionSubmittedAt: string | null
  pitch: string | null
}

export interface CampaignCreatorsResponse {
  campaign: {
    id: string
    brandName: string
    campaignCode: string
    status: string
  }
  statusCounts: {
    all: number
    approved: number
    pending: number
    completed: number
    applied: number
    rejected: number
    paymentApproved: number
  }
  creators: CampaignCreatorDetail[]
}

export async function GET(req: NextRequest) {
  try {
    const admin = await getAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    if (!hasModuleAccess(admin, 'poc_dashboard')) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions' }, { status: 403 })
    }

    const { searchParams } = new URL(req.url)
    const campaignId = searchParams.get('campaignId')

    if (!campaignId) {
      return NextResponse.json({ error: 'Missing campaignId parameter' }, { status: 400 })
    }

    // 1. Fetch Campaign info
    const campaignRes = await pool.query(
      `SELECT id, brand_name, campaign_code, status 
       FROM campaigns 
       WHERE id = $1 
       LIMIT 1`,
      [campaignId]
    )

    if (campaignRes.rows.length === 0) {
      return NextResponse.json({ error: 'Campaign not found' }, { status: 404 })
    }

    const campaignRow = campaignRes.rows[0]

    // 2. Fetch all applications + creator details for this campaign
    const appsRes = await pool.query(
      `
      SELECT 
        a.id as application_id,
        a.user_id,
        a.status,
        a.created_at as applied_at,
        a.form_data,
        a.team_remark,
        a.team_remark_by,
        a.team_remark_updated_at,
        COALESCE(a.payment_amount, 0) as payment_amount,
        COALESCE(a.partial_payment, 0) as partial_payment,
        COALESCE(a.final_payment, 0) as final_payment,
        a.completion_submitted_at,
        u.full_name,
        u.instagram_username,
        u.instagram_profile_pic,
        COALESCE(u.followers, u.instagram_followers_count, 0) as followers,
        u.mobile,
        u.city
      FROM applications a
      LEFT JOIN users u ON a.user_id = u.id
      WHERE a.campaign_id = $1
      ORDER BY 
        CASE 
          WHEN a.status = 'Approved' THEN 1
          WHEN a.status = 'Payment Approved' THEN 2
          WHEN a.status = 'Completed' THEN 3
          WHEN a.status = 'Applied' THEN 4
          WHEN a.status = 'Under Process' THEN 5
          WHEN a.status = 'Rejected' THEN 6
          ELSE 7
        END,
        a.created_at DESC
      `,
      [campaignId]
    )

    let approvedCount = 0
    let pendingCount = 0
    let appliedCount = 0
    let completedCount = 0
    let rejectedCount = 0
    let paymentApprovedCount = 0

    const creators: CampaignCreatorDetail[] = appsRes.rows.map(row => {
      const status = row.status || 'Applied'
      const hasCompletion = Boolean(row.completion_submitted_at)
      const isCompleted = status === 'Completed' || hasCompletion
      const isUnderReview = status === 'Applied' || status === 'Under Process' || status === 'Under Review'
      const isRejected = status === 'Rejected'
      const isApproved = !isUnderReview && !isRejected

      if (isApproved) {
        approvedCount++
        if (isCompleted) {
          completedCount++
        } else {
          pendingCount++
        }
      } else if (isUnderReview) {
        appliedCount++
      } else if (isRejected) {
        rejectedCount++
      }

      if (status === 'Payment Approved' || status === 'Payment Initiated' || status === 'Payment Requested') {
        paymentApprovedCount++
      }

      // Extract pitch from form_data
      let pitch: string | null = null
      if (row.form_data && typeof row.form_data === 'object') {
        pitch = row.form_data.pitch || row.form_data['Why should we select you?'] || null
      }

      return {
        applicationId: row.application_id,
        userId: row.user_id,
        creatorName: row.full_name || 'Anonymous Creator',
        instagramUsername: row.instagram_username || null,
        profilePic: row.instagram_profile_pic || null,
        followers: Number(row.followers) || 0,
        mobile: row.mobile || null,
        city: row.city || null,
        status,
        appliedAt: row.applied_at ? new Date(row.applied_at).toISOString() : '',
        teamRemark: row.team_remark || null,
        teamRemarkBy: row.team_remark_by || null,
        teamRemarkUpdatedAt: row.team_remark_updated_at ? new Date(row.team_remark_updated_at).toISOString() : null,
        paymentAmount: row.payment_amount ? Number(row.payment_amount) : null,
        partialPayment: Number(row.partial_payment) || 0,
        finalPayment: Number(row.final_payment) || 0,
        completionSubmittedAt: row.completion_submitted_at ? new Date(row.completion_submitted_at).toISOString() : null,
        pitch,
      }
    })

    return NextResponse.json({
      campaign: {
        id: campaignRow.id,
        brandName: campaignRow.brand_name || 'Unnamed Brand',
        campaignCode: campaignRow.campaign_code || 'N/A',
        status: campaignRow.status || 'Draft',
      },
      statusCounts: {
        all: creators.length,
        approved: approvedCount,
        pending: pendingCount,
        applied: appliedCount,
        completed: completedCount,
        rejected: rejectedCount,
        paymentApproved: paymentApprovedCount,
      },
      creators,
    })
  } catch (error) {
    console.error('Error fetching campaign creators:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
