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
  campaignCode: string,
  reason?: string
) {
  await sendNotificationEmail({
    to: email,
    subject: `Application Update – ${brandName}`,
    bodyHtml: `
      <p style="font-size: 16px; color: #333; margin-top: 0;">Hello ${userName},</p>
      <p style="font-size: 16px; color: #333;">Thank you for your interest in the <strong>${brandName}</strong> campaign <span style="color: #6366f1; font-weight: 600;">(${campaignCode})</span>.</p>
      
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 15px 20px; border-radius: 8px; margin: 25px 0;">
        <p style="font-size: 14px; color: #991b1b; margin: 0 0 ${reason ? '8px' : '0'} 0;">❌ <strong>Status:</strong> <span style="font-weight: 600;">Needs Revision / Not Selected</span></p>
        ${reason ? `<p style="font-size: 13px; color: #7f1d1d; margin: 0;">💬 <strong>Feedback / Reason:</strong> ${reason}</p>` : ''}
      </div>

      <p style="font-size: 14px; color: #64748b;">You may update your profile or details and re-apply from your dashboard. Keep applying and you'll find the perfect collaboration!</p>
    `,
  })
}

export async function sendLoginOtpEmail(email: string, otp: string) {
  await sendNotificationEmail({
    to: email,
    subject: 'Your 1to7 Login Verification Code',
    bodyHtml: `
      <p style="font-size: 16px; color: #333; margin-top: 0;">Hello,</p>
      <p style="font-size: 16px; color: #333;">Your single-use verification code to securely login to your <strong>1to7</strong> account is:</p>
      
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border: 1px solid #312e81; padding: 20px 25px; border-radius: 12px; text-align: center; margin: 25px 0;">
        <span style="font-size: 34px; font-weight: 800; font-family: monospace; letter-spacing: 8px; color: #ffffff; text-shadow: 0 2px 10px rgba(99,102,241,0.5);">${otp}</span>
      </div>
      
      <p style="font-size: 13px; color: #64748b; line-height: 1.5;">⏳ This code is valid for <strong>5 minutes</strong>. If you did not request this login code, you can safely ignore this email.</p>
    `,
  })
}

export async function sendSignupOtpEmail(email: string, otp: string) {
  await sendNotificationEmail({
    to: email,
    subject: 'Your 1to7 Signup Verification Code',
    bodyHtml: `
      <p style="font-size: 16px; color: #333; margin-top: 0;">Welcome to 1to7! 🎉</p>
      <p style="font-size: 16px; color: #333;">Your verification code to complete your <strong>1to7 Creator Account</strong> registration is:</p>
      
      <div style="background: linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%); border: 1px solid #312e81; padding: 20px 25px; border-radius: 12px; text-align: center; margin: 25px 0;">
        <span style="font-size: 34px; font-weight: 800; font-family: monospace; letter-spacing: 8px; color: #ffffff; text-shadow: 0 2px 10px rgba(99,102,241,0.5);">${otp}</span>
      </div>
      
      <p style="font-size: 13px; color: #64748b; line-height: 1.5;">⏳ This code is valid for <strong>5 minutes</strong>. If you did not request this verification code, you can safely ignore this email.</p>
    `,
  })
}

export async function sendDeliverableOverdueEmail(
  email: string,
  userName: string,
  brandName: string,
  campaignCode: string,
  daysOverdue: number,
  pocName?: string | null,
  pocPhone?: string | null
) {
  const contactInfo = pocPhone
    ? `<p style="font-size: 14px; color: #475569; margin: 10px 0 0 0;">📞 <strong>Assigned POC:</strong> ${pocName || 'Campaign Manager'} (<a href="https://wa.me/91${pocPhone.replace(/\D/g, '')}" style="color: #059669; font-weight: 600; text-decoration: none;">WhatsApp +91 ${pocPhone}</a>)</p>`
    : `<p style="font-size: 14px; color: #475569; margin: 10px 0 0 0;">👤 <strong>Assigned POC:</strong> ${pocName || 'Campaign Manager'}</p>`

  await sendNotificationEmail({
    to: email,
    subject: `Action Required: Deliverable Submission Overdue – ${brandName}`,
    bodyHtml: `
      <p style="font-size: 16px; color: #333; margin-top: 0;">Hi ${userName},</p>
      <p style="font-size: 16px; color: #333;">Your completion form for <strong>${brandName}</strong> <span style="color: #6366f1; font-weight: 600;">(${campaignCode})</span> is overdue by <strong>${daysOverdue} day${daysOverdue > 1 ? 's' : ''}</strong>.</p>
      
      <div style="background-color: #fffbeb; border: 1px solid #fde68a; padding: 18px 20px; border-radius: 10px; margin: 20px 0;">
        <p style="font-size: 14px; color: #92400e; font-weight: 700; margin: 0 0 6px 0;">⚠️ Too Delayed to Complete Deliverables</p>
        <p style="font-size: 13px; color: #78350f; margin: 0;">Please fill the completion form at the earliest to ensure timely payout processing, or reach out to your Point of Contact immediately.</p>
        ${contactInfo}
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://1to7media.in'}/dashboard/approved" style="display: inline-block; background-color: #0f172a; color: #ffffff; padding: 12px 26px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 700;">Submit Deliverable Proof</a>
      </div>
      <p style="font-size: 13px; color: #64748b;">Failure to complete deliverables may pause your ability to apply for new campaigns.</p>
    `,
  })
}

export async function sendCreatorActionRequiredGhostedEmail(
  email: string,
  userName: string,
  brandName: string,
  campaignCode: string,
  pocName?: string | null,
  pocPhone?: string | null
) {
  const contactInfo = pocPhone
    ? `<p style="font-size: 14px; color: #475569; margin: 10px 0 0 0;">📞 <strong>Assigned POC:</strong> ${pocName || 'Campaign Manager'} (<a href="https://wa.me/91${pocPhone.replace(/\D/g, '')}" style="color: #059669; font-weight: 600; text-decoration: none;">WhatsApp +91 ${pocPhone}</a>)</p>`
    : `<p style="font-size: 14px; color: #475569; margin: 10px 0 0 0;">👤 <strong>Assigned POC:</strong> ${pocName || 'Campaign Manager'}</p>`

  await sendNotificationEmail({
    to: email,
    subject: `URGENT: Collaboration Attention Required – ${brandName}`,
    bodyHtml: `
      <p style="font-size: 16px; color: #333; margin-top: 0;">Hi ${userName},</p>
      <p style="font-size: 16px; color: #333;">Your collaboration for <strong>${brandName}</strong> <span style="color: #6366f1; font-weight: 600;">(${campaignCode})</span> has been flagged due to unresponsiveness or overdue deliverables.</p>
      
      <div style="background-color: #fef2f2; border: 1px solid #fecaca; padding: 18px 20px; border-radius: 10px; margin: 20px 0;">
        <p style="font-size: 14px; color: #991b1b; font-weight: 700; margin: 0 0 6px 0;">🚫 New Campaign Applications Paused</p>
        <p style="font-size: 13px; color: #7f1d1d; margin: 0;">Because your deliverable completion form remains pending without response, your ability to apply for new campaigns on 1to7 has been temporarily paused.</p>
        ${contactInfo}
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://1to7media.in'}/dashboard/approved" style="display: inline-block; background-color: #dc2626; color: #ffffff; padding: 12px 26px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 700;">Open Approved Collaborations</a>
      </div>
      <p style="font-size: 13px; color: #64748b;">Please complete the completion form or contact your POC as soon as possible so your account status can be reviewed and unblocked.</p>
    `,
  })
}

export async function sendCreatorCollaborationRestoredEmail(
  email: string,
  userName: string,
  brandName: string,
  campaignCode: string
) {
  await sendNotificationEmail({
    to: email,
    subject: `✅ Collaboration Status Restored – ${brandName}`,
    bodyHtml: `
      <p style="font-size: 16px; color: #333; margin-top: 0;">Great news, ${userName}! 🎉</p>
      <p style="font-size: 16px; color: #333;">Your collaboration for <strong>${brandName}</strong> <span style="color: #6366f1; font-weight: 600;">(${campaignCode})</span> has been verified and restored by the campaign manager.</p>
      
      <div style="background-color: #ecfdf5; border: 1px solid #a7f3d0; padding: 18px 20px; border-radius: 10px; margin: 20px 0;">
        <p style="font-size: 14px; color: #065f46; font-weight: 700; margin: 0;">✅ Account Fully Active</p>
        <p style="font-size: 13px; color: #047857; margin: 6px 0 0 0;">You can now apply to new campaigns and manage your active collaborations as normal.</p>
      </div>

      <div style="text-align: center; margin: 25px 0;">
        <a href="${process.env.NEXT_PUBLIC_APP_URL || 'https://1to7media.in'}/dashboard" style="display: inline-block; background-color: #059669; color: #ffffff; padding: 12px 26px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 700;">Explore Campaigns</a>
      </div>
    `,
  })
}


