import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getBrandFromRequest } from '@/lib/brand-auth'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const brandUser = await getBrandFromRequest()
    if (!brandUser) {
      return NextResponse.json({ error: 'Unauthorized: Brand login required' }, { status: 401 })
    }

    const query = `
      SELECT 
        a.id AS application_id,
        a.campaign_id,
        a.status::text AS application_status,
        a.address_status,
        a.address_verified_at,
        a.form_data,
        a.updated_at,
        c.campaign_code,
        c.brand_name AS campaign_brand_name,
        c.deliverables,
        c.order_form_fields,
        u.full_name AS creator_name,
        u.influencer_id,
        u.instagram_username,
        u.followers,
        u.city AS user_city,
        u.state AS user_state,
        u.pincode AS user_pincode,
        u.mobile AS user_mobile,
        u.shipping_addresses
      FROM public.applications a
      JOIN public.campaigns c ON a.campaign_id = c.id
      JOIN public.users u ON a.user_id = u.id
      WHERE COALESCE((a.form_data->'brand_dispatch'->>'is_released')::boolean, false) = true
        AND (
          c.brand_id = $1
          OR LOWER(TRIM(COALESCE(c.brand_name, ''))) = LOWER(TRIM($2))
          OR LOWER(TRIM(COALESCE(a.form_data->'brand_dispatch'->>'target_brand', ''))) = LOWER(TRIM($2))
          OR LOWER(TRIM(COALESCE(a.form_data->'sent_to_brand'->>'target_brand', ''))) = LOWER(TRIM($2))
        )
      ORDER BY a.updated_at DESC
    `

    const { rows } = await pool.query(query, [brandUser.brand_id, brandUser.brand_name || ''])

    const dynamicFieldKeysSet = new Set<string>()
    const shipments = rows.map((row) => {
      const fd = row.form_data || {}
      const shippingAddr = fd.shipping_address || {}
      const userShippingList = Array.isArray(row.shipping_addresses) ? row.shipping_addresses : []
      const primarySavedAddr =
        userShippingList.find((addr: any) => addr?.is_default || addr?.isDefault) ||
        userShippingList[0] ||
        {}

      const brandDispatch = fd.brand_dispatch || {}
      const visibleFields: string[] = Array.isArray(brandDispatch.visible_fields)
        ? brandDispatch.visible_fields
        : [
            'recipient_name',
            'phone',
            'alt_phone',
            'full_address',
            'city_state_pin',
            'selected_variant',
            'instagram_username',
            'custom_order_fields',
          ]

      const showField = (key: string) => visibleFields.includes(key)

      // Custom order form fields
      const orderDetails: Record<string, string> = {}
      if (showField('custom_order_fields')) {
        if (fd.order_details && typeof fd.order_details === 'object') {
          Object.entries(fd.order_details).forEach(([k, v]) => {
            if (k && !k.startsWith('_') && v !== null && v !== undefined && String(v).trim() !== '') {
              orderDetails[k] = String(v).trim()
              dynamicFieldKeysSet.add(k)
            }
          })
        }
        if (Array.isArray(row.order_form_fields)) {
          row.order_form_fields.forEach((f: any) => {
            if (f?.name && !orderDetails[f.name] && fd[f.name]) {
              orderDetails[f.name] = String(fd[f.name]).trim()
              dynamicFieldKeysSet.add(f.name)
            }
          })
        }
      }

      const recipientName =
        shippingAddr.recipient_name ||
        shippingAddr.full_name ||
        shippingAddr.name ||
        primarySavedAddr.recipient_name ||
        primarySavedAddr.full_name ||
        row.creator_name ||
        'Creator'

      const phone = showField('phone')
        ? shippingAddr.mobile ||
          shippingAddr.phone ||
          primarySavedAddr.mobile ||
          primarySavedAddr.phone ||
          row.user_mobile ||
          ''
        : ''

      const altPhone = showField('alt_phone')
        ? shippingAddr.alt_mobile ||
          shippingAddr.alternate_phone ||
          primarySavedAddr.alt_mobile ||
          ''
        : ''

      const line1 =
        shippingAddr.address_line1 ||
        shippingAddr.street ||
        primarySavedAddr.address_line1 ||
        primarySavedAddr.street ||
        ''
      const line2 =
        shippingAddr.address_line2 ||
        shippingAddr.area ||
        primarySavedAddr.address_line2 ||
        ''
      const landmark = shippingAddr.landmark || primarySavedAddr.landmark || ''
      const fullStreet = showField('full_address')
        ? [line1, line2, landmark ? `Near ${landmark}` : ''].filter(Boolean).join(', ')
        : ''

      const city = shippingAddr.city || primarySavedAddr.city || row.user_city || ''
      const state = shippingAddr.state || primarySavedAddr.state || row.user_state || ''
      const pincode = shippingAddr.pincode || primarySavedAddr.pincode || row.user_pincode || ''
      const deliveryRemarks = shippingAddr.delivery_remarks || shippingAddr.delivery_notes || ''

      const selectedVariant = showField('selected_variant')
        ? fd.selected_variant ||
          fd.product_variant ||
          fd.variant ||
          fd.size ||
          fd.shade ||
          row.deliverables ||
          'Standard Sample'
        : 'Standard Sample'

      const rawStatus = brandDispatch.dispatch_status || 'sent_to_brand'
      const isShipped = rawStatus === 'shipped' || rawStatus === 'delivered'

      const courierCopyText = [
        `Recipient: ${recipientName}`,
        phone ? `Phone: ${phone}${altPhone ? ` / Alt: ${altPhone}` : ''}` : '',
        fullStreet ? `Address: ${fullStreet}` : '',
        `City/State: ${[city, state].filter(Boolean).join(', ')} - ${pincode}`,
        `Product/SKU: ${selectedVariant}`,
        Object.keys(orderDetails).length > 0
          ? `Details: ${Object.entries(orderDetails)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' | ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n')

      return {
        application_id: row.application_id,
        campaign_id: row.campaign_id,
        campaign_code: row.campaign_code || 'CAM',
        campaign_title: row.deliverables || row.campaign_code || 'Campaign',
        batch_label: brandDispatch.batch_label || 'Approved Dispatch Roster',
        creator_name: row.creator_name || 'Creator',
        instagram_username: showField('instagram_username')
          ? (row.instagram_username || '').replace(/^@/, '')
          : '',
        followers: Number(row.followers) || 0,
        recipient_name: recipientName,
        phone,
        alt_phone: altPhone,
        full_street: fullStreet,
        city,
        state,
        pincode,
        remarks: deliveryRemarks,
        selected_variant: selectedVariant,
        order_details: orderDetails,
        courier_copy_text: courierCopyText,
        dispatch_status: isShipped ? 'shipped' : 'pending_dispatch',
        courier_name: brandDispatch.courier_name || null,
        awb_number: brandDispatch.awb_number || null,
        shipped_at: brandDispatch.shipped_at || null,
        shipped_by: brandDispatch.shipped_by || null,
        dispatch_notes: brandDispatch.dispatch_notes || null,
        released_at: brandDispatch.released_at || row.updated_at,
      }
    })

    return NextResponse.json({
      shipments,
      dynamicFieldKeys: Array.from(dynamicFieldKeysSet),
    })
  } catch (error: any) {
    console.error('GET /api/brand/dispatch error:', error)
    return NextResponse.json({ error: 'Failed to load dispatch shipments' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const brandUser = await getBrandFromRequest()
    if (!brandUser) {
      return NextResponse.json({ error: 'Unauthorized: Brand login required' }, { status: 401 })
    }

    const body = await request.json()
    const { application_ids, action, courier_name, awb_number, notes } = body as {
      application_ids: string[]
      action: 'mark_shipped' | 'mark_pending'
      courier_name?: string
      awb_number?: string
      notes?: string
    }

    if (!Array.isArray(application_ids) || application_ids.length === 0) {
      return NextResponse.json({ error: 'Please select at least one creator shipment' }, { status: 400 })
    }

    const nowIso = new Date().toISOString()
    const actorName = `${brandUser.contact_name || brandUser.brand_name} (Brand)`

    const patchObj: Record<string, any> =
      action === 'mark_pending'
        ? {
            dispatch_status: 'sent_to_brand',
            shipped_at: null,
            shipped_by: null,
          }
        : {
            dispatch_status: 'shipped',
            shipped_at: nowIso,
            shipped_by: actorName,
          }

    if (courier_name !== undefined) patchObj.courier_name = courier_name.trim() || null
    if (awb_number !== undefined) patchObj.awb_number = awb_number.trim() || null
    if (notes !== undefined) patchObj.dispatch_notes = notes.trim() || null

    const updateRes = await pool.query(
      `
      UPDATE public.applications a
      SET
        form_data = jsonb_set(
          COALESCE(a.form_data, '{}'::jsonb),
          '{brand_dispatch}',
          COALESCE(a.form_data->'brand_dispatch', '{}'::jsonb) || $2::jsonb,
          true
        ),
        updated_at = NOW()
      FROM public.campaigns c
      WHERE a.campaign_id = c.id
        AND a.id = ANY($1::uuid[])
        AND COALESCE((a.form_data->'brand_dispatch'->>'is_released')::boolean, false) = true
        AND (
          c.brand_id = $3
          OR LOWER(TRIM(COALESCE(c.brand_name, ''))) = LOWER(TRIM($4))
          OR LOWER(TRIM(COALESCE(a.form_data->'brand_dispatch'->>'target_brand', ''))) = LOWER(TRIM($4))
        )
      RETURNING a.id
      `,
      [application_ids, JSON.stringify(patchObj), brandUser.brand_id, brandUser.brand_name || '']
    )

    return NextResponse.json({
      success: true,
      updated_count: updateRes.rowCount,
      message:
        action === 'mark_pending'
          ? `Reverted ${updateRes.rowCount} shipment(s) to Pending Dispatch.`
          : `Marked ${updateRes.rowCount} sample(s) as Shipped!`,
    })
  } catch (error: any) {
    console.error('POST /api/brand/dispatch error:', error)
    return NextResponse.json({ error: 'Failed to update dispatch status' }, { status: 500 })
  }
}
