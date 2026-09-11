import { getSiteUrl } from '@/lib/site-url'
import { Resend } from 'resend';

// Initialize Resend
const resendApiKey = process.env.RESEND_API_KEY;
const resend = resendApiKey ? new Resend(resendApiKey) : null;
const fromEmail = process.env.RESEND_FROM_EMAIL || 'noreply@bhuwanta.com';

// Same fallback pattern used everywhere else in the app (src/app/layout.tsx,
// robots.ts, sitemap.ts, etc.) — falls back to the real production domain,
// never localhost, so a stray missing env var never leaks a dev URL into an
// email a real person receives.
const siteUrl = getSiteUrl();
// The logo must always use the public production URL; otherwise email clients (Gmail, Outlook) 
// will fail to load it when testing locally because they cannot resolve localhost.
const logoUrl = `https://bhuwanta.com/logo.png`;

/**
 * Shared branded shell every REALESTATE_SOFTWARE transactional email is
 * built on — one place to keep the logo, colors, and layout consistent
 * instead of duplicating a full HTML document per email. Table-based
 * layout with inline styles throughout (not a <style> block, not
 * flexbox/grid) because that's what actually renders correctly across
 * real-world email clients, especially Outlook desktop — CSS support in
 * email is roughly 20 years behind the browser.
 *
 * Colors match the app's own design system exactly (AGENTS.md "Colors
 * (MUST follow)" table) — navy #0f1d33/#1e3a5f, gold #c4a55a, soft gray
 * #f7f8fa, border #e8ecf2, muted text #5a6a82 — so an email and the
 * dashboard it links to/from feel like the same product.
 *
 * The logo itself is black-on-transparent (checked the actual file), so
 * the header stays light — a dark navy header would make it disappear.
 */
function renderEmailShell(opts: { preheader: string; bodyHtml: string }): string {
  return `<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Bhuwanta</title>
  </head>
  <body style="margin:0; padding:0; background-color:#f7f8fa; font-family: Arial, Helvetica, sans-serif;">
    <!-- Preheader: the short preview text inbox lists show next to the subject, hidden from the rendered email itself -->
    <div style="display:none; max-height:0; overflow:hidden; opacity:0; mso-hide:all;">
      ${opts.preheader}
    </div>

    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8fa;">
      <tr>
        <td align="center" style="padding: 32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%; max-width:600px; background-color:#ffffff; border-radius:16px; overflow:hidden; box-shadow: 0 4px 24px rgba(15,29,51,0.08);">

            <!-- Header: logo on white, matches the logo's own light-background design -->
            <tr>
              <td align="center" style="padding: 36px 40px 28px; background-color:#ffffff;">
                <img src="${logoUrl}" alt="Bhuwanta Developers" width="220" style="display:block; width:220px; max-width:80%; height:auto; border:0;" />
              </td>
            </tr>

            <!-- Gold accent divider -->
            <tr>
              <td style="height:4px; line-height:4px; font-size:0; background-color:#c4a55a;">&nbsp;</td>
            </tr>

            <!-- Body -->
            <tr>
              <td style="padding: 40px;">
                ${opts.bodyHtml}
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td style="padding: 24px 40px; background-color:#f7f8fa; border-top:1px solid #e8ecf2; text-align:center;">
                <p style="margin:0; font-size:13px; font-weight:600; color:#0f1d33;">Bhuwanta Developers Pvt. Ltd.</p>
                <p style="margin:4px 0 0; font-size:12px; color:#5a6a82;">Land Today, Landmark Tomorrow</p>
                <p style="margin:16px 0 0; font-size:11px; color:#a0abbb; line-height:1.5;">
                  This is an automated message — please don't reply directly to this email.<br />
                  If you weren't expecting this, you can safely ignore it.
                </p>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

/** Reusable gold CTA button — the one visual anchor every email should have exactly one of. */
function renderButton(label: string, href: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" style="margin: 28px 0;">
    <tr>
      <td align="center" style="border-radius:10px; background-color:#c4a55a;">
        <a href="${href}" target="_blank" style="display:inline-block; padding:14px 32px; font-size:15px; font-weight:700; color:#ffffff; text-decoration:none; border-radius:10px;">
          ${label}
        </a>
      </td>
    </tr>
  </table>`;
}

export async function sendSetupPasswordEmail(email: string, name: string, actionLink: string) {
  if (!resend) {
    console.warn('RESEND_API_KEY is not set. Skipping sendSetupPasswordEmail.');
    return { success: false, error: 'Resend API key missing' };
  }

  try {
    const bodyHtml = `
      <p style="margin:0 0 4px; font-size:13px; font-weight:700; letter-spacing:0.06em; color:#c4a55a; text-transform:uppercase;">Account Created</p>
      <h1 style="margin:0 0 16px; font-size:24px; line-height:1.3; color:#0f1d33;">Welcome to Bhuwanta, ${name}!</h1>
      <p style="margin:0 0 8px; font-size:15px; line-height:1.6; color:#5a6a82;">
        An account has been created for you on the Bhuwanta platform. Before you can sign in, set up a secure password of your own — it only takes a moment.
      </p>
      ${renderButton('Set My Password', actionLink)}
      <p style="margin:0; font-size:13px; line-height:1.6; color:#a0abbb;">
        For your security, this link can only be used once and will expire soon. If it's expired by the time you click it, just ask whoever created your account to send a new one.
      </p>
    `;
    const html = renderEmailShell({
      preheader: `Set up your Bhuwanta account password to get started.`,
      bodyHtml,
    });

    const data = await resend.emails.send({
      from: `Bhuwanta <${fromEmail}>`,
      to: email,
      subject: 'Set Up Your Bhuwanta Account',
      html,
    });
    return { success: true, data };
  } catch (error: any) {
    console.error('Error sending setup link email:', error);
    return { success: false, error: error.message };
  }
}

/** Sent after an administrator changes someone's password FOR them (the
 * bulk reset on User Management) — states who did it and hands over the
 * new credentials directly in an Email/Password block, at the sender's
 * explicit request (the alternative — a "your password changed, ask
 * your admin for the new one" email with no password in it — is what
 * this replaced). */
export async function sendPasswordChangedEmail(email: string, name: string, newPassword: string) {
  if (!resend) {
    console.warn('RESEND_API_KEY is not set. Skipping sendPasswordChangedEmail.');
    return { success: false, error: 'Resend API key missing' };
  }

  try {
    const bodyHtml = `
      <p style="margin:0 0 4px; font-size:13px; font-weight:700; letter-spacing:0.06em; color:#c4a55a; text-transform:uppercase;">Security</p>
      <h1 style="margin:0 0 16px; font-size:24px; line-height:1.3; color:#0f1d33;">Your Password Was Changed</h1>
      <p style="margin:0 0 16px; font-size:15px; line-height:1.6; color:#5a6a82;">
        ${name ? `Hi ${name}, ` : ''}an administrator reset your Bhuwanta account password for security reasons. Use these to sign in:
      </p>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f7f8fa; border:1px solid #e8ecf2; border-radius:10px; margin:0 0 20px;">
        <tr>
          <td style="padding:16px 20px;">
            <p style="margin:0 0 6px; font-size:14px; color:#5a6a82;">Email: <strong style="color:#0f1d33;">${email}</strong></p>
            <p style="margin:0; font-size:14px; color:#5a6a82;">Password: <strong style="color:#0f1d33; font-family: 'Courier New', monospace;">${newPassword}</strong></p>
          </td>
        </tr>
      </table>
      ${renderButton('Sign In Now', `${siteUrl}/REALESTATE_SOFTWARE/login`)}
      <p style="margin:0; font-size:13px; line-height:1.6; color:#a0abbb;">
        If you weren't expecting this, contact your administrator straight away.
      </p>
    `;
    const html = renderEmailShell({
      preheader: `Your Bhuwanta account password was changed by an administrator.`,
      bodyHtml,
    });

    const data = await resend.emails.send({
      from: `Bhuwanta Security <${fromEmail}>`,
      to: email,
      subject: 'Your Bhuwanta Password Was Changed',
      html,
    });
    return { success: true, data };
  } catch (error: any) {
    console.error('Error sending password-changed email:', error);
    return { success: false, error: error.message };
  }
}

export async function sendRecoveryEmail(email: string, actionLink: string) {
  if (!resend) {
    console.warn('RESEND_API_KEY is not set. Skipping sendRecoveryEmail.');
    return { success: false, error: 'Resend API key missing' };
  }

  try {
    const bodyHtml = `
      <p style="margin:0 0 4px; font-size:13px; font-weight:700; letter-spacing:0.06em; color:#c4a55a; text-transform:uppercase;">Security</p>
      <h1 style="margin:0 0 16px; font-size:24px; line-height:1.3; color:#0f1d33;">Reset Your Password</h1>
      <p style="margin:0 0 8px; font-size:15px; line-height:1.6; color:#5a6a82;">
        We received a request to reset the password for the Bhuwanta account linked to <strong style="color:#0f1d33;">${email}</strong>. Click below to choose a new one.
      </p>
      ${renderButton('Reset Password', actionLink)}
      <p style="margin:0; font-size:13px; line-height:1.6; color:#a0abbb;">
        This link can only be used once and will expire soon. If you didn't request this, no action is needed — your password will stay exactly as it is.
      </p>
    `;
    const html = renderEmailShell({
      preheader: `Reset the password for your Bhuwanta account.`,
      bodyHtml,
    });

    const data = await resend.emails.send({
      from: `Bhuwanta Security <${fromEmail}>`,
      to: email,
      subject: 'Reset Your Bhuwanta Password',
      html,
    });
    return { success: true, data };
  } catch (error: any) {
    console.error('Error sending recovery email:', error);
    return { success: false, error: error.message };
  }
}
