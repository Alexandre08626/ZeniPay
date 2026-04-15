export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../modules/zenipay/services/supabase";
import nodemailer from "nodemailer";

const SMTP_USER = process.env.SMTP_USER || "zenipay@zeniva.ca";
const SMTP_PASS = process.env.SMTP_PASS || "";
const DELAY_MS = 5000; // 5 seconds between emails

let _transporter: nodemailer.Transporter | null = null;
function getTransporter() {
  if (!_transporter) {
    _transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user: SMTP_USER, pass: SMTP_PASS },
      pool: true,
      maxConnections: 1,
      maxMessages: 3,
      rateDelta: 5000,
      rateLimit: 1,
    });
  }
  return _transporter;
}

const PHYSICAL_ADDRESS = "ZeniPay · 895 Rue Raoul-Jobin, Québec, QC G1N 1S6 · Canada · 581-748-7017";

function addFooter(html: string, email: string): string {
  const unsub = `mailto:unsubscribe@zenipay.ca?subject=Unsubscribe&body=Remove%20${encodeURIComponent(email)}`;
  const footer = `<div style="margin-top:32px;padding-top:20px;border-top:1px solid #e2e8f0;text-align:center;font-size:12px;color:#94a3b8;line-height:1.6;"><p style="margin:0 0 8px;">${PHYSICAL_ADDRESS}</p><p style="margin:0;"><a href="${unsub}" style="color:#6366f1;">Unsubscribe</a> · <a href="https://zenipay.ca/privacy" style="color:#6366f1;">Privacy</a></p></div>`;
  if (html.includes("</body>")) return html.replace("</body>", footer + "</body>");
  return html + footer;
}

export async function POST(req: NextRequest) {
  try {
    const { audience, subject, html_body, to } = await req.json();
    if (!subject || !html_body) return NextResponse.json({ error: "subject and html_body required" }, { status: 400 });

    const supabase = getSupabaseAdmin();
    let recipients: { email: string; name: string }[] = [];

    if (to) {
      recipients = [{ email: to, name: "" }];
    } else if (audience === "sandbox") {
      const { data } = await supabase.from("zenipay_merchants").select("email, business_name").eq("status", "sandbox");
      recipients = (data || []).filter((m: any) => m.email).map((m: any) => ({ email: m.email, name: m.business_name || "" }));
    } else if (audience === "leads") {
      const { data } = await supabase.from("zenipay_leads").select("email, business_name").eq("status", "new");
      recipients = (data || []).filter((l: any) => l.email).map((l: any) => ({ email: l.email, name: l.business_name || "" }));
    } else {
      const { data } = await supabase.from("zenipay_merchants").select("email, business_name");
      recipients = (data || []).filter((m: any) => m.email).map((m: any) => ({ email: m.email, name: m.business_name || "" }));
    }

    if (recipients.length === 0) {
      return NextResponse.json({ error: "No recipients found", sent: 0 }, { status: 400 });
    }

    // Save campaign
    await supabase.from("zenipay_marketing_campaigns").insert({
      id: `MC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name: subject, subject, html_body, audience: audience || "single",
      recipients: recipients.map(r => r.email), sent_count: 0, status: "sending", sent_at: new Date().toISOString(),
    });

    // Send emails via SMTP
    const transporter = getTransporter();
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const r of recipients) {
      try {
        const personalizedHtml = html_body
          .replace(/\{\{BUSINESS_NAME\}\}/g, r.name || "there")
          .replace(/\{\{OWNER_NAME\}\}/g, r.name || "")
          .replace(/\{\{EMAIL\}\}/g, r.email)
          .replace(/\{\{WEBSITE\}\}/g, "");

        await transporter.sendMail({
          from: `"ZeniPay" <${SMTP_USER}>`,
          to: r.email,
          subject: subject.replace(/\{\{BUSINESS_NAME\}\}/g, r.name || "there"),
          html: addFooter(personalizedHtml, r.email),
          text: personalizedHtml.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim(),
          headers: {
            "List-Unsubscribe": `<mailto:unsubscribe@zenipay.ca?subject=Unsubscribe>`,
            "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
          },
        });
        sent++;
      } catch (err: any) {
        failed++;
        errors.push(`${r.email}: ${err?.message || "unknown"}`);
      }

      // Throttle
      if (DELAY_MS > 0) await new Promise(resolve => setTimeout(resolve, DELAY_MS));
    }

    // Update campaign status
    await supabase.from("zenipay_marketing_campaigns").update({
      sent_count: sent, failed_count: failed, status: "sent",
    }).eq("status", "sending").order("created_at", { ascending: false }).limit(1);

    return NextResponse.json({ ok: true, sent, failed, errors, recipients: recipients.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Failed" }, { status: 500 });
  }
}
