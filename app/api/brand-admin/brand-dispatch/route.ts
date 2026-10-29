import { NextResponse } from 'next/server'
import pool from '@/lib/db'
import { getBrandAdminFromRequest } from '@/lib/brand-admin-auth'

export const dynamic = 'force-dynamic'

const DEFAULT_DISPATCH_COLUMNS = [
  { key: 'recipient_name', label: 'Recipient Full Name', category: 'courier' },
  { key: 'phone', label: 'Primary Contact Phone', category: 'courier' },
  { key: 'alt_phone', label: 'Alternate Phone Number', category: 'courier' },
  { key: 'full_address', label: 'Full Street Address & Landmark', category: 'courier' },
  { key: 'city_state_pin', label: 'City, State & 6-Digit Pincode', category: 'courier' },
  { key: 'selected_variant', label: 'Product Variant / Deliverable SKU', category: 'product' },
  { key: 'instagram_username', label: 'Creator Instagram Handle', category: 'creator' },
  { key: 'custom_order_fields', label: 'Dynamic Campaign Custom Form Fields', category: 'product' },
]

export async function GET(request: Request) {
  try {
    const admin = await getBrandAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized: Brand Admin access required' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const brandFilter = searchParams.get('brand') || 'all'
    const campaignFilter = searchParams.get('campaign') || 'all'
    const statusFilter = searchParams.get('status') || 'all'
    const search = (searchParams.get('search') || '').trim().toLowerCase()

    const query = `
      SELECT 
        a.id AS application_id,
        a.user_id,
        a.campaign_id,
        a.status::text AS application_status,
        a.brand_review_status,
        a.address_status,
        a.address_verified_at,
        a.address_verified_by,
        a.form_data,
        a.updated_at,
        a.created_at,
        c.campaign_code,
        c.brand_name AS campaign_brand_name,
        c.category,
        c.platform,
        c.deliverables,
        c.product_links,
        c.order_form_fields,
        b.name AS linked_brand_name,
        u.full_name AS creator_name,
        u.influencer_id,
        u.instagram_username,
        u.followers,
        u.city AS user_city,
        u.state AS user_state,
        u.pincode AS user_pincode,
        u.mobile AS user_mobile,
        u.email AS user_email,
        u.instagram_profile_pic AS profile_photo,
        u.shipping_addresses
      FROM public.applications a
      JOIN public.campaigns c ON a.campaign_id = c.id
      LEFT JOIN public.brands b ON c.brand_id = b.id
      JOIN public.users u ON a.user_id = u.id
      WHERE (
        a.status = 'Approved'::application_status
        OR (
          a.brand_review_status = 'brand_approved'
          AND COALESCE((a.form_data->'brand_curation'->>'is_finalized')::boolean, false) = true
        )
        OR COALESCE((a.form_data->'brand_dispatch'->>'is_released')::boolean, false) = true
      )
      ORDER BY a.updated_at DESC
      LIMIT 3000
    `

    const { rows } = await pool.query(query)

    // Collect unique brands, campaigns, and dynamic custom field keys
    const brandSet = new Set<string>()
    const campaignMap = new Map<string, { id: string; campaign_code: string; title: string; brand_name: string }>()
    const dynamicFieldKeysSet = new Set<string>()

    const items = rows.map((row) => {
      const fd = row.form_data || {}
      const shippingAddr = fd.shipping_address || {}
      const userShippingList = Array.isArray(row.shipping_addresses) ? row.shipping_addresses : []
      const primarySavedAddr =
        userShippingList.find((addr: any) => addr?.is_default || addr?.isDefault) ||
        userShippingList[0] ||
        {}

      // Extract custom order/form fields
      const orderDetails: Record<string, string> = {}
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
          if (f?.name) {
            dynamicFieldKeysSet.add(f.name)
            if (!orderDetails[f.name] && fd[f.name]) {
              orderDetails[f.name] = String(fd[f.name]).trim()
            }
          }
        })
      }

      // Resolve address verification status
      let addressVerificationStatus: 'Verified' | 'Pending' | 'Rejected' | 'Not Submitted' = 'Not Submitted'
      if (row.address_status === 'Approved' || fd.address_verified === true) {
        addressVerificationStatus = 'Verified'
      } else if (row.address_status === 'Rejected' || fd.address_status === 'Rejected') {
        addressVerificationStatus = 'Rejected'
      } else if (
        row.address_status === 'Pending' ||
        fd.address_confirmed === true ||
        Boolean(
          shippingAddr.address_line1 ||
            shippingAddr.street ||
            shippingAddr.pincode ||
            primarySavedAddr.address_line1 ||
            primarySavedAddr.street
        )
      ) {
        addressVerificationStatus = 'Pending'
      }

      const recipientName =
        shippingAddr.recipient_name ||
        shippingAddr.full_name ||
        shippingAddr.name ||
        primarySavedAddr.recipient_name ||
        primarySavedAddr.full_name ||
        row.creator_name ||
        'Creator'

      const phone =
        shippingAddr.mobile ||
        shippingAddr.phone ||
        primarySavedAddr.mobile ||
        primarySavedAddr.phone ||
        row.user_mobile ||
        ''

      const altPhone =
        shippingAddr.alt_mobile ||
        shippingAddr.alternate_phone ||
        primarySavedAddr.alt_mobile ||
        ''

      const line1 = shippingAddr.address_line1 || shippingAddr.street || primarySavedAddr.address_line1 || primarySavedAddr.street || ''
      const line2 = shippingAddr.address_line2 || shippingAddr.area || primarySavedAddr.address_line2 || ''
      const landmark = shippingAddr.landmark || primarySavedAddr.landmark || ''
      const fullStreet = [line1, line2, landmark ? `Near ${landmark}` : ''].filter(Boolean).join(', ')

      const city = shippingAddr.city || primarySavedAddr.city || row.user_city || ''
      const state = shippingAddr.state || primarySavedAddr.state || row.user_state || ''
      const pincode = shippingAddr.pincode || primarySavedAddr.pincode || row.user_pincode || ''
      const deliveryRemarks = shippingAddr.delivery_remarks || shippingAddr.delivery_notes || ''

      const selectedVariant =
        fd.selected_variant ||
        fd.product_variant ||
        fd.variant ||
        fd.size ||
        fd.shade ||
        row.deliverables ||
        'Standard Sample'

      const brandDispatch = fd.brand_dispatch || {}
      const isReleased = Boolean(brandDispatch.is_released)
      const rawDispatchStatus = brandDispatch.dispatch_status || (isReleased ? 'sent_to_brand' : 'ready_to_release')
      const isShipped = rawDispatchStatus === 'shipped' || rawDispatchStatus === 'delivered'

      const effectiveBrandName =
        brandDispatch.target_brand ||
        fd.sent_to_brand?.target_brand ||
        row.linked_brand_name ||
        row.campaign_brand_name ||
        'Unassigned'

      if (effectiveBrandName && effectiveBrandName !== 'Unassigned') {
        brandSet.add(effectiveBrandName)
      }

      if (row.campaign_id && !campaignMap.has(row.campaign_id)) {
        campaignMap.set(row.campaign_id, {
          id: row.campaign_id,
          campaign_code: row.campaign_code || 'CAM',
          title: row.deliverables || row.campaign_code || 'Campaign',
          brand_name: effectiveBrandName,
        })
      }

      const courierCopyText = [
        `Recipient: ${recipientName}`,
        `Phone: ${phone}${altPhone ? ` / Alt: ${altPhone}` : ''}`,
        `Address: ${fullStreet || 'N/A'}`,
        `City/State: ${[city, state].filter(Boolean).join(', ')} - ${pincode}`,
        `Product/SKU: ${selectedVariant}`,
        Object.keys(orderDetails).length > 0
          ? `Custom Details: ${Object.entries(orderDetails)
              .map(([k, v]) => `${k}: ${v}`)
              .join(' | ')}`
          : '',
      ]
        .filter(Boolean)
        .join('\n')

      return {
        application_id: row.application_id,
        user_id: row.user_id,
        campaign_id: row.campaign_id,
        campaign_code: row.campaign_code || 'N/A',
        campaign_title: row.deliverables || row.campaign_code || 'Campaign',
        brand_name: effectiveBrandName,
        creator_name: row.creator_name || 'Creator',
        influencer_id: row.influencer_id || 'N/A',
        instagram_username: (row.instagram_username || '').replace(/^@/, ''),
        followers: Number(row.followers) || 0,
        profile_photo: row.profile_photo || null,
        selected_variant: selectedVariant,
        order_details: orderDetails,
        address_verification_status: addressVerificationStatus,
        address_verified_at: row.address_verified_at || fd.address_verified_at || null,
        address_verified_by: row.address_verified_by || fd.address_verified_by || null,
        shipping: {
          recipient_name: recipientName,
          phone,
          alt_phone: altPhone,
          line1,
          line2,
          landmark,
          full_street: fullStreet,
          city,
          state,
          pincode,
          remarks: deliveryRemarks,
          courier_copy_text: courierCopyText,
        },
        dispatch: {
          is_released: isReleased,
          released_at: brandDispatch.released_at || null,
          released_by: brandDispatch.released_by || null,
          target_brand: brandDispatch.target_brand || effectiveBrandName,
          batch_label: brandDispatch.batch_label || fd.sent_to_brand?.batch_label || null,
          dispatch_status: isShipped
            ? 'shipped'
            : isReleased
              ? 'sent_to_brand'
              : addressVerificationStatus === 'Verified'
                ? 'ready_for_dispatch'
                : 'address_pending',
          courier_name: brandDispatch.courier_name || null,
          awb_number: brandDispatch.awb_number || null,
          shipped_at: brandDispatch.shipped_at || null,
          shipped_by: brandDispatch.shipped_by || null,
          dispatch_notes: brandDispatch.dispatch_notes || null,
          visible_fields: Array.isArray(brandDispatch.visible_fields)
            ? brandDispatch.visible_fields
            : DEFAULT_DISPATCH_COLUMNS.map((c) => c.key),
        },
        updated_at: row.updated_at,
      }
    })

    // Scope by brand & campaign before computing counts
    const scopedItems = items.filter((item) => {
      if (brandFilter !== 'all' && item.brand_name.toLowerCase() !== brandFilter.toLowerCase()) {
        return false
      }
      if (campaignFilter !== 'all' && item.campaign_id !== campaignFilter) {
        return false
      }
      if (search) {
        const hay = [
          item.creator_name,
          item.instagram_username,
          item.influencer_id,
          item.brand_name,
          item.campaign_code,
          item.shipping.recipient_name,
          item.shipping.phone,
          item.shipping.city,
          item.shipping.state,
          item.shipping.pincode,
          item.selected_variant,
          item.dispatch.awb_number || '',
          item.dispatch.courier_name || '',
        ]
          .join(' ')
          .toLowerCase()
        if (!hay.includes(search)) return false
      }
      return true
    })

    const counts = {
      all: scopedItems.length,
      ready_for_dispatch: scopedItems.filter(
        (i) => i.address_verification_status === 'Verified' && !i.dispatch.is_released && i.dispatch.dispatch_status !== 'shipped'
      ).length,
      address_pending: scopedItems.filter((i) => i.address_verification_status !== 'Verified').length,
      sent_to_brand: scopedItems.filter(
        (i) => i.dispatch.is_released && i.dispatch.dispatch_status !== 'shipped'
      ).length,
      shipped: scopedItems.filter((i) => i.dispatch.dispatch_status === 'shipped').length,
    }

    const filteredItems = scopedItems.filter((item) => {
      if (statusFilter === 'all') return true
      if (statusFilter === 'ready_for_dispatch') {
        return (
          item.address_verification_status === 'Verified' &&
          !item.dispatch.is_released &&
          item.dispatch.dispatch_status !== 'shipped'
        )
      }
      if (statusFilter === 'address_pending') {
        return item.address_verification_status !== 'Verified'
      }
      if (statusFilter === 'sent_to_brand') {
        return item.dispatch.is_released && item.dispatch.dispatch_status !== 'shipped'
      }
      if (statusFilter === 'shipped') {
        return item.dispatch.dispatch_status === 'shipped'
      }
      return true
    })

    // Also fetch registered client brands
    let registeredBrands: Array<{ id: string; name: string; slug: string; isActive: boolean; assignedKam: string }> = []
    try {
      const regRes = await pool.query(`
        SELECT b.id, b.brand_name, b.brand_slug, b.is_active, u.full_name as kam_name
        FROM public.brands b
        LEFT JOIN public.users u ON b.assigned_kam_id = u.id
        ORDER BY b.is_active DESC, b.brand_name ASC
      `)
      registeredBrands = regRes.rows.map((r) => ({
        id: r.id,
        name: r.brand_name,
        slug: r.brand_slug,
        isActive: r.is_active !== false,
        assignedKam: r.kam_name || 'Unassigned',
      }))
    } catch {
      // Ignore if table not ready
    }

    return NextResponse.json({
      items: filteredItems,
      counts,
      brands: Array.from(brandSet).sort(),
      registeredBrands,
      campaigns: Array.from(campaignMap.values()),
      dynamicFieldKeys: Array.from(dynamicFieldKeysSet),
    })
  } catch (error: any) {
    console.error('GET /api/brand-admin/brand-dispatch error:', error)
    return NextResponse.json(
      { error: 'Failed to load Brand Dispatch queue', details: error?.message },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const client = await pool.connect()
  try {
    const admin = await getBrandAdminFromRequest()
    if (!admin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      action,
      applicationIds,
      targetBrand,
      batchLabel,
      visibleFields,
      dispatchNotes,
      courierName,
      awbNumber,
      shippingUpdate,
    } = body as {
      action: 'release_to_brand' | 'verify_address' | 'mark_shipped' | 'unrelease'
      applicationIds: string[]
      targetBrand?: string
      batchLabel?: string
      visibleFields?: string[]
      dispatchNotes?: string
      courierName?: string
      awbNumber?: string
      shippingUpdate?: {
        recipient_name?: string
        phone?: string
        alt_phone?: string
        line1?: string
        city?: string
        state?: string
        pincode?: string
        selected_variant?: string
      }
    }

    if (!Array.isArray(applicationIds) || applicationIds.length === 0) {
      return NextResponse.json({ error: 'Please select at least one creator profile' }, { status: 400 })
    }

    const nowIso = new Date().toISOString()
    const actorName = admin.name || admin.email

    await client.query('BEGIN')

    if (action === 'release_to_brand') {
      if (!targetBrand || !targetBrand.trim()) {
        await client.query('ROLLBACK')
        return NextResponse.json({ error: 'Please select a target Client Brand Workspace' }, { status: 400 })
      }

      const brandCheck = await client.query(
        `SELECT id, brand_name FROM public.brands WHERE LOWER(TRIM(brand_name)) = LOWER(TRIM($1)) OR LOWER(TRIM(brand_slug)) = LOWER(TRIM($1)) LIMIT 1`,
        [targetBrand]
      )
      const registeredBrand = brandCheck.rows[0]
      const canonicalBrandName = registeredBrand?.brand_name || targetBrand.trim()
      const finalBatchLabel =
        batchLabel?.trim() ||
        `Dispatch - ${new Date().toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`
      const fieldsToShare =
        Array.isArray(visibleFields) && visibleFields.length > 0
          ? visibleFields
          : DEFAULT_DISPATCH_COLUMNS.map((c) => c.key)

      const dispatchMeta = {
        is_released: true,
        released_at: nowIso,
        released_by: actorName,
        target_brand: canonicalBrandName,
        batch_label: finalBatchLabel,
        visible_fields: fieldsToShare,
        dispatch_status: 'sent_to_brand',
        dispatch_notes: dispatchNotes?.trim() || null,
      }

      const updateRes = await client.query(
        `
        UPDATE public.applications
        SET
          form_data = jsonb_set(
            COALESCE(form_data, '{}'::jsonb),
            '{brand_dispatch}',
            COALESCE(form_data->'brand_dispatch', '{}'::jsonb) || $2::jsonb,
            true
          ),
          updated_at = NOW()
        WHERE id = ANY($1::uuid[])
        RETURNING id, campaign_id
        `,
        [applicationIds, JSON.stringify(dispatchMeta)]
      )

      // Link campaigns to brand workspace so the Brand Portal can query seamlessly
      if (registeredBrand?.id && updateRes.rows.length > 0) {
        const campaignIds = Array.from(new Set(updateRes.rows.map((r: any) => r.campaign_id).filter(Boolean)))
        if (campaignIds.length > 0) {
          await client.query(
            `UPDATE public.campaigns SET brand_id = $1 WHERE id = ANY($2::uuid[])`,
            [registeredBrand.id, campaignIds]
          )
        }
      }

      await client.query('COMMIT')
      return NextResponse.json({
        success: true,
        message: `Published ${updateRes.rowCount} creator courier manifest(s) to ${canonicalBrandName}'s Product Dispatch tab!`,
      })
    }

    if (action === 'verify_address') {
      // Optionally update shipping_address fields if provided, and mark address_status = 'Approved'
      for (const appId of applicationIds) {
        const existingRes = await client.query(
          `SELECT form_data FROM public.applications WHERE id = $1`,
          [appId]
        )
        if (existingRes.rows.length === 0) continue
        const fd = existingRes.rows[0].form_data || {}
        const currentShipping = fd.shipping_address || {}

        const nextShipping = shippingUpdate
          ? {
              ...currentShipping,
              recipient_name: shippingUpdate.recipient_name ?? currentShipping.recipient_name,
              mobile: shippingUpdate.phone ?? currentShipping.mobile,
              alt_mobile: shippingUpdate.alt_phone ?? currentShipping.alt_mobile,
              address_line1: shippingUpdate.line1 ?? currentShipping.address_line1,
              city: shippingUpdate.city ?? currentShipping.city,
              state: shippingUpdate.state ?? currentShipping.state,
              pincode: shippingUpdate.pincode ?? currentShipping.pincode,
            }
          : currentShipping

        const nextFd = {
          ...fd,
          shipping_address: nextShipping,
          selected_variant: shippingUpdate?.selected_variant ?? fd.selected_variant,
          address_confirmed: true,
          address_verified: true,
          address_status: 'Approved',
          address_verified_at: nowIso,
          address_verified_by: actorName,
        }

        await client.query(
          `
          UPDATE public.applications
          SET
            address_status = 'Approved',
            address_verified_at = NOW(),
            address_verified_by = $2,
            form_data = $3::jsonb,
            updated_at = NOW()
          WHERE id = $1
          `,
          [appId, actorName, JSON.stringify(nextFd)]
        )
      }

      await client.query('COMMIT')
      return NextResponse.json({
        success: true,
        message: `Verified delivery address for ${applicationIds.length} creator(s). Ready for Brand Dispatch!`,
      })
    }

    if (action === 'mark_shipped') {
      const shipMeta: Record<string, any> = {
        is_released: true,
        dispatch_status: 'shipped',
        shipped_at: nowIso,
        shipped_by: actorName,
      }
      if (courierName !== undefined) shipMeta.courier_name = courierName.trim() || null
      if (awbNumber !== undefined) shipMeta.awb_number = awbNumber.trim() || null
      if (dispatchNotes !== undefined) shipMeta.dispatch_notes = dispatchNotes.trim() || null

      const updateRes = await client.query(
        `
        UPDATE public.applications
        SET
          form_data = jsonb_set(
            COALESCE(form_data, '{}'::jsonb),
            '{brand_dispatch}',
            COALESCE(form_data->'brand_dispatch', '{}'::jsonb) || $2::jsonb,
            true
          ),
          updated_at = NOW()
        WHERE id = ANY($1::uuid[])
        RETURNING id
        `,
        [applicationIds, JSON.stringify(shipMeta)]
      )

      await client.query('COMMIT')
      return NextResponse.json({
        success: true,
        message: `Marked ${updateRes.rowCount} creator shipment(s) as Shipped!`,
      })
    }

    if (action === 'unrelease') {
      const unreleaseMeta = {
        is_released: false,
        dispatch_status: 'ready_to_release',
      }
      const updateRes = await client.query(
        `
        UPDATE public.applications
        SET
          form_data = jsonb_set(
            COALESCE(form_data, '{}'::jsonb),
            '{brand_dispatch}',
            COALESCE(form_data->'brand_dispatch', '{}'::jsonb) || $2::jsonb,
            true
          ),
          updated_at = NOW()
        WHERE id = ANY($1::uuid[])
        RETURNING id
        `,
        [applicationIds, JSON.stringify(unreleaseMeta)]
      )

      await client.query('COMMIT')
      return NextResponse.json({
        success: true,
        message: `Withdrew ${updateRes.rowCount} creator(s) from Brand Dispatch portal.`,
      })
    }

    await client.query('ROLLBACK')
    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 })
  } catch (error: any) {
    await client.query('ROLLBACK')
    console.error('POST /api/brand-admin/brand-dispatch error:', error)
    return NextResponse.json(
      { error: 'Failed to process Brand Dispatch action', details: error?.message },
      { status: 500 }
    )
  } finally {
    client.release()
  }
}

