import nodemailer from 'nodemailer'

// Lazy-initialized transporter
let transporter: nodemailer.Transporter | null = null

function getTransporter() {
  if (transporter) return transporter

  const gmailUser = process.env.GMAIL_USER
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD

  if (!gmailUser || !gmailAppPassword) {
    throw new Error('Missing GMAIL_USER or GMAIL_APP_PASSWORD')
  }

  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  })

  return transporter
}

// Shared branded email wrapper
function wrapInTemplate(bodyHtml: string) {
  return `
    <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; border: 1px solid #eee; border-radius: 10px; overflow: hidden;">
      <div style="background-color: #0f172a; padding: 20px; text-align: center;">
        <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: bold; letter-spacing: 1px;">1to7</h1>
      </div>
      <div style="padding: 30px; background-color: #fafafa;">
        ${bodyHtml}
        <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #e2e8f0;">
          <p style="font-size: 13px; color: #94a3b8; margin: 0;">– Team 1to7</p>
        </div>
      </div>
    </div>
  `
}

interface SendEmailParams {
  to: string
  subject: string
  bodyHtml: string
}

export async function sendNotificationEmail({ to, subject, bodyHtml }: SendEmailParams) {
  try {
    const t = getTransporter()
    const gmailUser = process.env.GMAIL_USER

    await t.sendMail({
      from: `"1to7" <${gmailUser}>`,
      to,
      subject,
      html: wrapInTemplate(bodyHtml),
    })

    console.log(`[EMAIL] Sent "${subject}" to ${to}`)
  } catch (error) {
    // Never let email failures propagate — they should not break the main flow
    console.error(`[EMAIL ERROR] Failed to send "${subject}" to ${to}:`, error)
  }
}

// ─── Pre-built notification emails ───────────────────────────────────────────

export async function sendApplicationSubmittedEmail(
  email: string,
  userName: string,
  brandName: string,
  campaignCode: string
) {
  await sendNotificationEmail({
    to: email,
    subject: `Application Submitted – ${brandName}`,
    bodyHtml: `
      <p style="font-size: 16px; color: #333; margin-top: 0;">Hey ${userName}! 👋</p>
      <p style="font-size: 16px; color: #333;">Your application for the <strong>${brandName}</strong> campaign <span style="color: #6366f1; font-weight: 600;">(${campaignCode})</span> has been submitted successfully!</p>
      
      <div style="background-color: #f1f5f9; border: 1px solid #cbd5e1; padding: 15px 20px; border-radius: 8px; margin: 25px 0;">
        <p style="font-size: 14px; color: #475569; margin: 0;">📋 <strong>Status:</strong> <span style="color: #f59e0b; font-weight: 600;">Under Review</span></p>
      </div>

      <p style="font-size: 14px; color: #64748b;">Our team will review your application and get back to you soon. You can track the status in your dashboard.</p>
    `,
  })
}

export async function sendApplicationApprovedEmail(
  email: string,
  userName: string,
  brandName: string,
  campaignCode: string
) {
  await sendNotificationEmail({
    to: email,
    subject: `🎉 Approved – ${brandName} Campaign`,
    bodyHtml: `
      <p style="font-size: 16px; color: #333; margin-top: 0;">Congratulations, ${userName}! 🎉</p>
      <p style="font-size: 16px; color: #333;">Great news! Your application for the <strong>${brandName}</strong> campaign <span style="color: #6366f1; font-weight: 600;">(${campaignCode})</span> has been <strong style="color: #10b981;">approved</strong>!</p>
      
      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 15px 20px; border-radius: 8px; margin: 25px 0;">
        <p style="font-size: 14px; color: #065f46; margin: 0;">✅ <strong>Status:</strong> <span style="font-weight: 600;">Approved</span></p>
      </div>

      <p style="font-size: 14px; color: #64748b;">Please check your dashboard for further instructions and campaign details. Let's create something amazing together!</p>
    `,
  })
}

export async function sendApplicationRejectedEmail(
  email: string,
  userName: string,
  brandName: string,
  campaignCode: string
) {
  await sendNotificationEmail({
    to: email,
    subject: `Application Update – ${brandName}`,
    bodyHtml: `
      <p style="font-size: 16px; color: #333; margin-top: 0;">Hello ${userName},</p>
      <p style="font-size: 16px; color: #333;">Thank you for your interest in the <strong>${brandName}</strong> campaign <span style="color: #6366f1; font-weight: 600;">(${campaignCode})</span>.</p>
      
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px 20px; border-radius: 8px; margin: 25px 0;">
        <p style="font-size: 14px; color: #991b1b; margin: 0;">❌ <strong>Status:</strong> <span style="font-weight: 600;">Not Selected</span></p>
      </div>

      <p style="font-size: 14px; color: #64748b;">Unfortunately, your application was not selected this time. Don't worry — new campaigns are posted regularly. Keep applying and you'll find the perfect match!</p>
    `,
  })
}
