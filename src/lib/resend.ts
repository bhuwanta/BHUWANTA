import { Resend } from 'resend'

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || 'noreply@bhuwanta.com'

const escapeHtml = (unsafe: string) => {
  if (!unsafe) return ''
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;")
}

// Send notification to team when a new lead comes in
export async function sendContactNotification(lead: {
  name: string
  email?: string
  phone?: string
  location?: string
  project?: string
  enquiryType?: string
  message?: string
  sourcePage?: string
  referredBy?: string
}) {
  if (!resend) {
    console.warn('Resend not configured, skipping email')
    return null
  }

  const emailsToNotify = Array.from(new Set([
    process.env.NEXT_PUBLIC_ADMIN_EMAIL || 'bhuwanta9@gmail.com',
    'info@bhuwanta.com',
    'bhuwanta9@gmail.com'
  ]))

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: emailsToNotify,
    ...(lead.email ? { replyTo: lead.email } : {}),
    subject: `New Lead: ${lead.name} — ${lead.project || 'General Inquiry'}`,
    html: `
      <h2>New Lead from ${escapeHtml(lead.sourcePage || 'Website')}</h2>
      <table style="text-align: left; border-collapse: collapse; width: 100%;">
        <tr><td style="padding: 8px; font-weight: bold;">Name:</td><td style="padding: 8px;">${escapeHtml(lead.name)}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Email:</td><td style="padding: 8px;">${escapeHtml(lead.email || 'N/A')}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Phone:</td><td style="padding: 8px;">${escapeHtml(lead.phone || 'N/A')}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Location:</td><td style="padding: 8px;">${escapeHtml(lead.location || 'All')}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Project:</td><td style="padding: 8px;">${escapeHtml(lead.project || 'Not Sure')}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Type:</td><td style="padding: 8px;">${escapeHtml(lead.enquiryType || 'Site Visit')}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Message:</td><td style="padding: 8px; white-space: pre-wrap;">${escapeHtml(lead.message || 'No message provided')}</td></tr>
        <tr><td style="padding: 8px; font-weight: bold;">Source:</td><td style="padding: 8px;">${escapeHtml(lead.sourcePage || 'Website')}</td></tr>
        ${lead.referredBy ? `<tr><td style="padding: 8px; font-weight: bold;">Referred By:</td><td style="padding: 8px;">${escapeHtml(lead.referredBy)}</td></tr>` : ''}
      </table>
    `,
  })

  if (error) {
    console.error('Resend Admin Notification Error:', error)
  }

  return data
}

// Send acknowledgement email to the lead
export async function sendLeadAcknowledgement(to: string, name: string) {
  if (!resend) return null

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: 'Thank you for contacting Bhuwanta',
    html: `
      <h2>Thank you, ${name}!</h2>
      <p>We've received your inquiry and our team will get back to you within 24 hours.</p>
      <p>In the meantime, feel free to explore our latest projects on our website.</p>
      <br/>
      <p>Best regards,<br/>The Bhuwanta Team</p>
    `,
  })
}

// Send follow-up email from dashboard
export async function sendFollowUpEmail(
  to: string,
  subject: string,
  htmlBody: string
) {
  if (!resend) return null

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject,
    html: htmlBody,
  })
}

// Send invite to newly created user
export async function sendUserCredentials(to: string, name: string, role: string, inviteLink: string) {
  if (!resend) return null

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Your Bhuwanta CRM ${role} Account Setup`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Welcome to Bhuwanta CRM, ${name || 'User'}!</h2>
        <p>An administrator has created a <strong>${role}</strong> account for you.</p>
        
        <p style="margin: 20px 0;">Please click the button below to set your password and access your account:</p>
        <p><a href="${inviteLink}" style="display: inline-block; padding: 12px 24px; background-color: #c4a55a; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Set Password & Log In</a></p>

        <p style="color: #5a6a82; font-size: 14px; margin-top: 30px;">
          If the button doesn't work, you can copy and paste this link into your browser:<br/>
          <a href="${inviteLink}" style="color: #c4a55a; word-break: break-all;">${inviteLink}</a>
        </p>
      </div>
    `,
  })
}

// Send password reset link
export async function sendPasswordResetLink(to: string, resetLink: string) {
  if (!resend) return null

  return resend.emails.send({
    from: FROM_EMAIL,
    to,
    subject: `Reset Your Bhuwanta CRM Password`,
    html: `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h2>Password Reset Request</h2>
        <p>An administrator has requested a password reset for your CRM account.</p>
        
        <p style="margin: 20px 0;">Please click the button below to set a new password:</p>
        <p><a href="${resetLink}" style="display: inline-block; padding: 12px 24px; background-color: #c4a55a; color: white; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 16px;">Set New Password</a></p>

        <p style="color: #5a6a82; font-size: 14px; margin-top: 30px;">
          If the button doesn't work, you can copy and paste this link into your browser:<br/>
          <a href="${resetLink}" style="color: #c4a55a; word-break: break-all;">${resetLink}</a>
        </p>
        <p style="color: #5a6a82; font-size: 12px; margin-top: 10px;">
          If you did not request this, you can safely ignore this email.
        </p>
      </div>
    `,
  })
}
