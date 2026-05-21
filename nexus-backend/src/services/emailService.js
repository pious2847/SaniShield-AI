const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.GMAIL_USER || !process.env.GMAIL_APP_PASSWORD) {
    return null;
  }
  transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });
  return transporter;
}

async function sendEmail({ to, subject, html, text }) {
  const t = getTransporter();
  if (!t) {
    console.log(`[Email-STUB] To: ${to} | Subject: ${subject}`);
    return { success: true, stub: true };
  }
  try {
    const info = await t.sendMail({
      from: `"N.E.X.U.S. Platform" <${process.env.GMAIL_USER}>`,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
    });
    return { success: true, messageId: info.messageId };
  } catch (err) {
    console.error('[Email] Send error:', err.message);
    return { success: false, error: err.message };
  }
}

async function sendAlertEmail(recipients, subject, htmlBody) {
  const results = [];
  for (const email of (Array.isArray(recipients) ? recipients : [recipients])) {
    if (!email) continue;
    results.push(await sendEmail({ to: email, subject, html: htmlBody }));
  }
  return results;
}

function buildAlertHtml(title, message, severity, actionUrl) {
  const colors = { emergency: '#b71c1c', critical: '#c62828', warning: '#f57f17', info: '#1565c0' };
  const bg = colors[severity] || colors.info;
  return `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
  <div style="background:${bg};padding:20px;text-align:center">
    <h1 style="color:#fff;margin:0;font-size:22px">N.E.X.U.S. — ${title}</h1>
    <span style="background:rgba(255,255,255,0.2);color:#fff;padding:4px 12px;border-radius:12px;font-size:12px;text-transform:uppercase">${severity.toUpperCase()}</span>
  </div>
  <div style="padding:24px">
    <p style="color:#333;font-size:16px;line-height:1.6">${message}</p>
    ${actionUrl ? `<div style="text-align:center;margin-top:24px"><a href="${actionUrl}" style="background:${bg};color:#fff;padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:bold">View Details</a></div>` : ''}
  </div>
  <div style="background:#f9f9f9;padding:16px;text-align:center;color:#888;font-size:12px">
    N.E.X.U.S. — Northern Environmental X-system for Universal Sanitation | Northern Ghana
  </div>
</div></body></html>`;
}

function buildBlogNotificationHtml(post) {
  return `
<!DOCTYPE html><html><body style="font-family:Arial,sans-serif;background:#f5f5f5;margin:0;padding:20px">
<div style="max-width:600px;margin:0 auto;background:#fff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1)">
  <div style="background:#00695C;padding:20px">
    <h1 style="color:#fff;margin:0;font-size:18px">New Blog Post on N.E.X.U.S.</h1>
  </div>
  <div style="padding:24px">
    ${post.cover_image_url ? `<img src="${post.cover_image_url}" alt="cover" style="width:100%;border-radius:6px;margin-bottom:16px">` : ''}
    <h2 style="color:#1a1a1a;margin-bottom:8px">${post.title}</h2>
    <p style="color:#555;font-size:14px">By ${post.author_name} &bull; ${post.district || 'Northern Ghana'}</p>
    <p style="color:#333;line-height:1.6">${post.summary || ''}</p>
  </div>
  <div style="background:#f9f9f9;padding:16px;text-align:center;color:#888;font-size:12px">
    N.E.X.U.S. Sanitation Platform | Northern Ghana
  </div>
</div></body></html>`;
}

module.exports = { sendEmail, sendAlertEmail, buildAlertHtml, buildBlogNotificationHtml, isConfigured: () => !!(process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD) };
