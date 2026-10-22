import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { verifyToken } from '@/lib/auth'
import { cookies } from 'next/headers'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid session. Please login again.' }, { status: 401 })
    }

    // Fetch application with campaign and user info
    const { data: app, error: appErr } = await supabase
      .from('applications')
      .select(`
        id,
        status,
        user_id,
        address_status,
        address_verified_at,
        form_data,
        created_at,
        campaigns (
          id,
          campaign_code,
          brand_name,
          platform,
          deliverables,
          budget_type,
          requirements,
          address_required,
          order_form,
          order_form_fields
        ),
        users (
          id,
          full_name,
          mobile,
          shipping_addresses,
          city,
          state,
          pincode
        )
      `)
      .eq('id', id)
      .single()

    if (appErr || !app) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    // Verify ownership
    if (app.user_id !== payload.id) {
      return NextResponse.json(
        { error: 'Forbidden. This application belongs to another account.' },
        { status: 403 }
      )
    }

    // Resolve current delivery address
    let currentAddress: any = null
    const fd = app.form_data || {}

    if (fd.shipping_address && typeof fd.shipping_address === 'object') {
      currentAddress = fd.shipping_address
    } else if (typeof fd.shipping_address === 'string' && fd.shipping_address.trim()) {
      currentAddress = {
        recipient_name: (app.users as any)?.full_name || '',
        mobile: (app.users as any)?.mobile || '',
        address_line1: fd.shipping_address,
        city: (app.users as any)?.city || '',
        state: (app.users as any)?.state || '',
        pincode: (app.users as any)?.pincode || '',
      }
    }

    // Fallback to user default shipping address
    const userAddresses = Array.isArray((app.users as any)?.shipping_addresses)
      ? (app.users as any).shipping_addresses
      : []

    if (!currentAddress && userAddresses.length > 0) {
      currentAddress = userAddresses.find((a: any) => a.is_default) || userAddresses[0]
    }

    return NextResponse.json({
      success: true,
      application: {
        id: app.id,
        status: app.status,
        address_status: (app as any).address_status || fd.address_status || null,
        address_verified: Boolean(fd.address_verified || (app as any).address_status === 'Approved'),
        address_verified_at: (app as any).address_verified_at || fd.address_verified_at || null,
        address_rejection_reason: fd.address_rejection_reason || null,
        campaign: app.campaigns,
        address_confirmed: Boolean(fd.address_confirmed),
        address_confirmed_at: fd.address_confirmed_at || null,
        current_address: currentAddress,
        saved_addresses: userAddresses,
        order_details: fd.order_details || {},
        creator: {
          full_name: (app.users as any)?.full_name,
          mobile: (app.users as any)?.mobile,
        },
      },
    })
  } catch (err: any) {
    console.error('Fetch Address Confirmation Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to fetch application address' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const cookieStore = await cookies()
    const token = cookieStore.get('auth_token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized. Please login.' }, { status: 401 })
    }

    const payload = await verifyToken(token)
    if (!payload || !payload.id) {
      return NextResponse.json({ error: 'Invalid session' }, { status: 401 })
    }

    const body = await request.json()
    const { shipping_address, save_to_profile = true } = body

    if (!shipping_address) {
      return NextResponse.json({ error: 'Shipping address is required' }, { status: 400 })
    }

    const recipientName = (shipping_address.recipient_name || shipping_address.name || '').trim()
    const mobile = (shipping_address.mobile || '').replace(/\D/g, '')
    const altMobile = (shipping_address.alt_mobile || '').replace(/\D/g, '')
    const line1 = (shipping_address.address_line1 || '').trim()
    const line2 = (shipping_address.address_line2 || '').trim()
    const landmark = (shipping_address.landmark || '').trim()
    const city = (shipping_address.city || '').trim()
    const state = (shipping_address.state || '').trim()
    const pincode = (shipping_address.pincode || '').replace(/\D/g, '')
    const notes = (shipping_address.delivery_remarks || shipping_address.delivery_notes || '').trim()
    const title = (shipping_address.title || shipping_address.address_type || 'Home').trim()

    // Validations
    if (!recipientName) {
      return NextResponse.json({ error: 'Recipient name is required' }, { status: 400 })
    }
    if (!mobile || mobile.length !== 10) {
      return NextResponse.json({ error: 'Valid 10-digit mobile number is required' }, { status: 400 })
    }
    if (altMobile && altMobile.length !== 10) {
      return NextResponse.json({ error: 'Alternate phone must be 10 digits' }, { status: 400 })
    }
    if (!line1) {
      return NextResponse.json({ error: 'Flat / House No. / Building is required' }, { status: 400 })
    }
    if (!city) {
      return NextResponse.json({ error: 'City is required' }, { status: 400 })
    }
    if (!state) {
      return NextResponse.json({ error: 'State is required' }, { status: 400 })
    }
    if (!pincode || pincode.length !== 6) {
      return NextResponse.json({ error: 'Valid 6-digit Pincode is required' }, { status: 400 })
    }

    // Verify ownership
    const { data: application, error: fetchErr } = await supabase
      .from('applications')
      .select('id, user_id, form_data, status')
      .eq('id', id)
      .single()

    if (fetchErr || !application) {
      return NextResponse.json({ error: 'Application not found' }, { status: 404 })
    }

    if (application.user_id !== payload.id) {
      return NextResponse.json({ error: 'Forbidden. Not your application.' }, { status: 403 })
    }

    const nowIso = new Date().toISOString()
    const addressId = shipping_address.id || `addr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`

    // Build normalized structured address
    const normalizedAddress = {
      id: addressId,
      title: title.charAt(0).toUpperCase() + title.slice(1).toLowerCase(),
      recipient_name: recipientName,
      name: recipientName,
      mobile,
      alt_mobile: altMobile || undefined,
      address_line1: line1,
      address_line2: line2 || undefined,
      landmark: landmark || undefined,
      city,
      state,
      pincode,
      delivery_remarks: notes || undefined,
      delivery_notes: notes || undefined,
      address_type: title.toLowerCase(),
      is_default: true,
      confirmed_at: nowIso,
      updated_at: nowIso,
    }

    // Formatted single-line dispatch string
    const formattedAddressString = [
      line1,
      line2,
      landmark ? `Near ${landmark}` : null,
      city,
      state,
      `PIN: ${pincode}`,
      `(Recipient: ${recipientName}, Ph: ${mobile}${altMobile ? ` / ${altMobile}` : ''})`,
    ]
      .filter(Boolean)
      .join(', ')

    // 1. Update application form_data
    const currentFormData = application.form_data || {}
    const incomingOrderDetails = body.order_details || body.extra_details || {}
    const updatedFormData = {
      ...currentFormData,
      shipping_address: normalizedAddress,
      formatted_shipping_address: formattedAddressString,
      address_confirmed: true,
      address_confirmed_at: nowIso,
      order_details: {
        ...(currentFormData.order_details || {}),
        ...incomingOrderDetails,
      },
    }

    const { error: appUpdateErr } = await supabase
      .from('applications')
      .update({
        form_data: updatedFormData,
        address_status: 'Pending',
        updated_at: nowIso,
      })
      .eq('id', id)

    if (appUpdateErr) throw appUpdateErr

    // 2. Sync to Creator Profile (users.shipping_addresses) if save_to_profile is true
    if (save_to_profile) {
      const { data: userProfile } = await supabase
        .from('users')
        .select('id, shipping_addresses, city, state, pincode')
        .eq('id', payload.id)
        .single()

      if (userProfile) {
        let existingAddrs: any[] = Array.isArray(userProfile.shipping_addresses)
          ? [...userProfile.shipping_addresses]
          : []

        // Set all existing to is_default: false
        existingAddrs = existingAddrs.map((a: any) => ({ ...a, is_default: false }))

        // Check if matching line1 and pincode already exists
        const matchIdx = existingAddrs.findIndex(
          (a: any) =>
            a.address_line1?.toLowerCase().trim() === line1.toLowerCase() &&
            a.pincode === pincode
        )

        if (matchIdx >= 0) {
          existingAddrs[matchIdx] = {
            ...existingAddrs[matchIdx],
            ...normalizedAddress,
            id: existingAddrs[matchIdx].id,
            is_default: true,
          }
        } else {
          // Add as primary default address (max 6 saved addresses)
          existingAddrs.unshift(normalizedAddress)
          if (existingAddrs.length > 6) {
            existingAddrs = existingAddrs.slice(0, 6)
          }
        }

        await supabase
          .from('users')
          .update({
            shipping_addresses: existingAddrs,
            city,
            state,
            pincode,
            updated_at: nowIso,
          })
          .eq('id', payload.id)
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Delivery address confirmed successfully! Brand will dispatch your parcel to this address.',
      shipping_address: normalizedAddress,
      address_confirmed_at: nowIso,
    })
  } catch (err: any) {
    console.error('Confirm Address Error:', err)
    return NextResponse.json(
      { error: err.message || 'Failed to confirm delivery address' },
      { status: 500 }
    )
  }
}
