import { sendEmail } from "./send";

const ZENIPAY_URL = "https://www.zenipay.ca";

export async function benAutoReply(to: string, originalSubject: string) {
  await sendEmail({
    to,
    fromName: "Ben — ZeniPay",
    subject: `Re: ${originalSubject || "Your message"} — ZeniPay Support`,
    replyTo: "zenipay@zeniva.ca",
    html: `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;">
<table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;background:#f8fafc;">
<tr><td align="center">
<table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

<tr><td style="background:linear-gradient(135deg,#0B1B4D,#0F6CF5);padding:30px;text-align:center;">
  <div style="font-size:36px;margin-bottom:8px;">💳</div>
  <h1 style="margin:0;color:#fff;font-size:22px;font-weight:800;">ZeniPay Support</h1>
  <p style="margin:6px 0 0;color:#93c5fd;font-size:13px;">Powered by Ben AI</p>
</td></tr>

<tr><td style="padding:30px;">
  <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 20px;">Hello,</p>
  <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 20px;">
    Thank you for contacting <strong>ZeniPay</strong>. I'm <strong>Ben</strong>, the AI finance agent at ZeniPay. Your message has been received and our team will review it promptly.
  </p>
  <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 20px;">
    Here's what I can help with:
  </p>
  <table width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
    <tr><td style="padding:8px 0;color:#1e293b;font-size:15px;">💳 Payment processing & transactions</td></tr>
    <tr><td style="padding:8px 0;color:#1e293b;font-size:15px;">📊 Financial reports & statements</td></tr>
    <tr><td style="padding:8px 0;color:#1e293b;font-size:15px;">🔒 Security & compliance questions</td></tr>
    <tr><td style="padding:8px 0;color:#1e293b;font-size:15px;">💰 Merchant onboarding & payouts</td></tr>
    <tr><td style="padding:8px 0;color:#1e293b;font-size:15px;">🛡️ Disputes & chargebacks</td></tr>
  </table>

  <p style="color:#1e293b;font-size:16px;line-height:1.6;margin:0 0 20px;">
    A member of our team will respond within <strong>24 hours</strong>. For urgent payment issues, reply directly to this email.
  </p>

  <table width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;">
  <tr><td align="center">
    <a href="${ZENIPAY_URL}" style="display:inline-block;background:linear-gradient(135deg,#0F6CF5,#0B1B4D);color:#fff;text-decoration:none;padding:14px 32px;border-radius:12px;font-size:15px;font-weight:700;">
      Visit ZeniPay Dashboard
    </a>
  </td></tr>
  </table>

  <p style="color:#64748b;font-size:14px;line-height:1.5;margin:20px 0 0;">
    Best regards,<br>
    <strong>Ben — ZeniPay AI Finance Agent</strong><br>
    <span style="color:#94a3b8;font-size:13px;">zenipay@zeniva.ca | zenipay.ca</span><br>
    <span style="color:#94a3b8;font-size:13px;">Zeniva Inc. · Delaware, USA</span>
  </p>
</td></tr>

<tr><td style="background:#f8fafc;padding:24px 30px;text-align:center;border-top:1px solid #e2e8f0;">
  <p style="margin:0 0 4px;color:#64748b;font-size:12px;font-weight:600;">💳 ZeniPay — Secure Payments by Zeniva</p>
  <p style="margin:0;color:#94a3b8;font-size:11px;">
    <a href="${ZENIPAY_URL}" style="color:#0F6CF5;text-decoration:none;">zenipay.ca</a>
  </p>
</td></tr>

</table>
</td></tr></table>
</body></html>`,
  });
}
