// Notification fanout for a newly-created approval_request.
// PR 3 channels: email (nodemailer / Brevo SMTP — already used by
// merchant marketing flows) + Slack webhook (if org has one). SMS is
// scaffolded as a no-op for Phase 4.
//
// Fail-safe: a notification failure does NOT block the approval flow.
// We log + mark the channel as failed in approval_requests.notifications_sent.

import { getAgentsDb } from "../supabase-client";
import type { ApprovalRequestRow } from "./request-manager";

export interface Approver {
  user_id: string;
  email?: string | null;
}

export interface NotifyResult {
  channel: "email" | "slack" | "sms";
  target: string;
  ok: boolean;
  error?: string;
  sent_at: string;
}

export async function notifyApprovers(req: ApprovalRequestRow, approvers: Approver[]): Promise<NotifyResult[]> {
  const results: NotifyResult[] = [];

  for (const a of approvers) {
    if (a.email) results.push(await sendEmail(req, a.email));
  }
  const slackUrl = process.env.AGENTS_APPROVAL_SLACK_WEBHOOK;
  if (slackUrl) results.push(await sendSlack(req, slackUrl));

  // Persist delivery log on the request row.
  await getAgentsDb()
    .from("approval_requests")
    .update({ notifications_sent: results })
    .eq("id", req.id);

  return results;
}

async function sendEmail(req: ApprovalRequestRow, to: string): Promise<NotifyResult> {
  const now = new Date().toISOString();
  try {
    const host = process.env.SMTP_HOST ?? "smtp-relay.brevo.com";
    const port = Number(process.env.SMTP_PORT ?? 587);
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    if (!user || !pass) return { channel: "email", target: to, ok: false, error: "smtp_not_configured", sent_at: now };

    const nodemailer = await import("nodemailer");
    const transport = nodemailer.createTransport({ host, port, secure: false, auth: { user, pass } });
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://zenipay.ca";
    const subject = `ZeniPay Agents — approval needed ($${((req.requested_amount_cents ?? 0) / 100).toFixed(2)})`;
    const body = `
A ZeniPay Agents card authorization needs your approval.

Amount: ${((req.requested_amount_cents ?? 0) / 100).toFixed(2)} ${req.requested_currency ?? "USD"}
Request id: ${req.id}

Review and approve: ${baseUrl}/agents/approvals/${req.id}
`.trim();
    await transport.sendMail({
      from: `"ZeniPay Agents" <${process.env.SMTP_FROM ?? user}>`,
      to, subject, text: body,
    });
    return { channel: "email", target: to, ok: true, sent_at: now };
  } catch (e) {
    return { channel: "email", target: to, ok: false, error: e instanceof Error ? e.message : "failed", sent_at: now };
  }
}

async function sendSlack(req: ApprovalRequestRow, webhookUrl: string): Promise<NotifyResult> {
  const now = new Date().toISOString();
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL ?? "https://zenipay.ca";
    const amount = ((req.requested_amount_cents ?? 0) / 100).toFixed(2);
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        text: `🤖 *ZeniPay Agents approval needed* — $${amount} ${req.requested_currency ?? "USD"}`,
        blocks: [
          { type: "section", text: { type: "mrkdwn", text: `*Approval required*\nAmount: *$${amount} ${req.requested_currency ?? "USD"}*\nRequest: \`${req.id}\`` } },
          { type: "actions", elements: [
            { type: "button", text: { type: "plain_text", text: "Review" }, url: `${baseUrl}/agents/approvals/${req.id}` },
          ] },
        ],
      }),
    });
    return { channel: "slack", target: "webhook", ok: res.ok, error: res.ok ? undefined : `HTTP ${res.status}`, sent_at: now };
  } catch (e) {
    return { channel: "slack", target: "webhook", ok: false, error: e instanceof Error ? e.message : "failed", sent_at: now };
  }
}
