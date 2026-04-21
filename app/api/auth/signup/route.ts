import { NextResponse } from 'next/server'
import { supabase } from '@/lib/supabase'
import { encrypt } from '@/lib/auth'
import { cookies } from 'next/headers'
import bcrypt from 'bcryptjs'
import nodemailer from 'nodemailer'
import { generateSequentialInfluencerId } from '@/lib/user-utils'

export async function POST(request: Request) {
  try {
    const { fullName, mobile, email, password, instagramUsername, gender } = await request.json()

    if (!fullName || !mobile || !email || !password || mobile.length !== 10) {
      return NextResponse.json({ error: 'All fields are required' }, { status: 400 })
    }

    // 1. Check if mobile or email already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .or(`mobile.eq.${mobile},email.eq.${email}`)
      .single()

    if (existingUser) {
      return NextResponse.json({ error: 'Mobile or Email already registered' }, { status: 409 })
    }

    // 2. Hash Password
    const hashedPassword = await bcrypt.hash(password, 10)

    // 3. Generate Influencer ID
    const newInfluencerId = await generateSequentialInfluencerId()

    // 4. Insert into users table
    const { data: newUser, error: insertError } = await supabase
      .from('users')
      .insert([
        { 
          full_name: fullName, 
          mobile, 
          email,
          password_hash: hashedPassword,
          instagram_username: instagramUsername, 
          gender, 
          influencer_id: newInfluencerId,
          is_email_verified: true
        }
      ])
      .select()
      .single()

    if (insertError) {
      console.error('Error inserting user:', insertError)
      return NextResponse.json({ error: 'Failed to create user account' }, { status: 500 })
    }

    // 5. Auto-login: Create JWT token
    const token = await encrypt({ id: newUser.id, mobile: newUser.mobile, influencer_id: newUser.influencer_id })

    // 6. Set httpOnly cookie
    const cookieStore = await cookies()
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30 // 30 days
    })

    // 7. Send welcome email with Influencer ID
    try {
      const gmailUser = process.env.GMAIL_USER
      const gmailAppPassword = process.env.GMAIL_APP_PASSWORD

      if (gmailUser && gmailAppPassword) {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: gmailUser,
            pass: gmailAppPassword,
          },
        })

        await transporter.sendMail({
          from: `"1to7" <${gmailUser}>`,
          to: email,
          subject: `Welcome to 1to7! Your Influencer ID: ${newInfluencerId}`,
          html: `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
              <div style="background-color: #0f172a; padding: 20px; text-align: center;">
                <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">1to7</h1>
              </div>
              <div style="padding: 30px; background-color: #fafafa;">
                <p style="font-size: 18px; color: #333; margin-top: 0;">Welcome, ${fullName}! 🎉</p>
                <p style="font-size: 16px; color: #333;">Your creator account has been successfully created. Here is your unique Influencer ID:</p>
                
                <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 15px 25px; border-radius: 8px; text-align: center; margin: 30px 0;">
                  <span style="font-size: 32px; font-weight: bold; font-family: monospace; letter-spacing: 5px; color: #4f46e5;">${newInfluencerId}</span>
                </div>

                <p style="font-size: 14px; color: #64748b;">Use this ID to log in or share it with brands for collaborations. Keep it safe!</p>
                
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
                  <p style="font-size: 13px; color: #94a3b8; margin: 0;">– Team 1to7</p>
                </div>
              </div>
            </div>
          `
        })
        console.log(`Welcome email with ID ${newInfluencerId} sent to ${email}`)
      }
    } catch (emailError) {
      // Don't fail signup if welcome email fails
      console.error('Failed to send welcome email:', emailError)
    }

    const { password_hash, ...userWithoutPassword } = newUser
    return NextResponse.json({ success: true, user: userWithoutPassword })
  } catch (error) {
    console.error('API /auth/signup Error:', error)
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })
  }
}
