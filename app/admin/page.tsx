"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import ZeniPayLogo from "@/components/ZeniPayLogo";
import { useT, LangToggle } from "../../modules/zenipay/i18n";

const ZP_GREEN  = "#2DBE60";
const ZP_CYAN   = "#15B8C9";
const ZP_BLUE   = "#2A8FE0";
const ZP_PURPLE = "#7B4FBF";
const ZP_GRAD   = `linear-gradient(135deg, ${ZP_GREEN} 0%, ${ZP_CYAN} 45%, ${ZP_PURPLE} 100%)`;

const fmt     = (n: number) => new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(n);
const fmtDate = (s: string) => { try { const d = new Date(s); return isNaN(d.getTime()) ? "—" : d.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); } catch { return "—"; } };
const fmtDateTime = (s: string) => { try { const d = new Date(s); return isNaN(d.getTime()) ? "—" : d.toLocaleString("en-US", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }); } catch { return "—"; } };

const STATUS_COLOR: Record<string, string> = { active: "#16A34A", pending: "#D97706", inactive: "#94A3B8", failed: "#DC2626", live: "#16A34A", sandbox: "#D97706", succeeded: "#16A34A", refunded: "#7B4FBF", suspended: "#DC2626" };
const STATUS_BG:    Record<string, string> = { active: "rgba(22,163,74,0.08)", pending: "rgba(217,119,6,0.08)", inactive: "rgba(148,163,184,0.08)", failed: "rgba(220,38,38,0.08)", live: "rgba(22,163,74,0.08)", sandbox: "rgba(217,119,6,0.08)", succeeded: "rgba(22,163,74,0.08)", refunded: "rgba(123,79,191,0.08)", suspended: "rgba(220,38,38,0.08)" };

const CLIENTS_DEFAULT: never[] = [];

const GATEWAY_STATUS = { accountId: "MUcTenaz57m9JrwwRZwpSfDc", webhook: "https://zenipay.ca/api/zenipay/webhooks/finix", fees: "2.90% + $0.30/tx" };
const BANK_STATUS    = { routing: "812345678", account: "••••5847", balance: 0, customerId: "4647873" };

const PLATFORM_ACCOUNT = {
  name: "ZeniPay Inc. — Platform Revenue",
  routing: "812345678",
  account: "••••9201",
  balance: 0,
  customerId: "ZP-PLATFORM-001",
  type: "Business Chequing (Unit.co)",
};

const FINIX_COST = {
  interchange: "1.75%",
  finixFee: "0.15% + $0.15/tx",
  totalCost: "1.90% + $0.15/tx",
  zeniCharge: "2.90% + $0.30/tx",
  markup: "1.00% + $0.15/tx",
  finixPaysBack: "90% of markup",
};
const COMMISSION_RULES = [
  { plan: "Standard", charged: "2.90% + $0.30", finixCost: "1.90% + $0.15", zeniMargin: "1.00% + $0.15", finixPaysBack: "0.90% + $0.135", color: ZP_GREEN  },
  { plan: "Business",  charged: "2.50% + $0.25", finixCost: "1.90% + $0.15", zeniMargin: "0.60% + $0.10", finixPaysBack: "0.54% + $0.09", color: ZP_CYAN   },
  { plan: "Complete",  charged: "2.00% + $0.20", finixCost: "1.90% + $0.15", zeniMargin: "0.10% + $0.05", finixPaysBack: "0.09% + $0.045", color: ZP_PURPLE },
];

const NAV = [
  { key: "overview",     icon: "▦",  label: "Overview",     color: ZP_GREEN  },
  { key: "clients",      icon: "⊞",  label: "Clients",      color: ZP_CYAN   },
  { key: "transactions", icon: "↕",  label: "Transactions", color: ZP_BLUE   },
  { key: "payouts",      icon: "→",  label: "Payouts",      color: ZP_PURPLE },
  { key: "bank",         icon: "⬡",  label: "ZeniCard",     color: ZP_GREEN  },
  { key: "api",          icon: "⌥",  label: "API & Keys",   color: ZP_CYAN   },
  { key: "billing",      icon: "💳", label: "Billing",      color: "#E5247B" },
  { key: "cashback",     icon: "💰", label: "Cashback",     color: "#10B981" },
  { key: "marketing",   icon: "📧", label: "Marketing",    color: "#E5247B" },
  { key: "leads",       icon: "🎯", label: "Lead Hunter",  color: "#F5A623" },
  { key: "settings",     icon: "⚙",  label: "Settings",     color: ZP_PURPLE },
] as const;
type TabKey = typeof NAV[number]["key"];

const EMAIL_TEMPLATES = [
  {
    id: "welcome",
    name: "Welcome to ZeniPay",
    subject: "Welcome to ZeniPay, {{BUSINESS_NAME}}!",
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Welcome to ZeniPay</title></head><body style="margin:0;padding:0;background:#f4f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa"><tr><td align="center" style="padding:40px 20px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)"><tr><td style="background:linear-gradient(135deg,#2DBE60,#15B8C9,#7B4FBF);padding:48px 40px;text-align:center"><img src="https://zenipay.ca/zenipay-logo-nobg.png" alt="ZeniPay" width="180" style="margin-bottom:24px"><h1 style="color:#ffffff;font-size:28px;margin:0 0 8px;font-weight:800">Welcome to ZeniPay!</h1><p style="color:rgba(255,255,255,0.9);font-size:16px;margin:0">Start accepting payments today</p></td></tr><tr><td style="padding:40px"><p style="font-size:16px;color:#0A0F1E;line-height:1.6;margin:0 0 24px">Hi {{OWNER_NAME}},</p><p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 32px">Thank you for signing up <strong>{{BUSINESS_NAME}}</strong> with ZeniPay. Your sandbox account is ready — here is what you can do right away:</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px"><tr><td style="padding:20px;background:#f0fdf4;border-radius:12px;border-left:4px solid #2DBE60;margin-bottom:12px"><strong style="color:#2DBE60;font-size:14px">Accept Cards</strong><p style="margin:4px 0 0;color:#475569;font-size:14px">Visa, Mastercard, Amex — all major cards supported instantly.</p></td></tr><tr><td style="height:12px"></td></tr><tr><td style="padding:20px;background:#f0fdfa;border-radius:12px;border-left:4px solid #15B8C9"><strong style="color:#15B8C9;font-size:14px">Instant Payouts</strong><p style="margin:4px 0 0;color:#475569;font-size:14px">Get your money fast with zero-day hold on payouts.</p></td></tr><tr><td style="height:12px"></td></tr><tr><td style="padding:20px;background:#faf5ff;border-radius:12px;border-left:4px solid #7B4FBF"><strong style="color:#7B4FBF;font-size:14px">Zero Setup Fees</strong><p style="margin:4px 0 0;color:#475569;font-size:14px">No monthly fees, no hidden charges. Pay only when you get paid.</p></td></tr></table><div style="text-align:center;margin:32px 0"><a href="https://zenipay.ca/dashboard" style="display:inline-block;background:linear-gradient(135deg,#2DBE60,#15B8C9,#7B4FBF);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700;letter-spacing:0.02em">Go to your dashboard &rarr;</a></div><p style="font-size:14px;color:#64748b;line-height:1.6;margin:24px 0 0">Need help getting started? Reply to this email or visit <a href="https://zenipay.ca/support" style="color:#15B8C9;text-decoration:none">zenipay.ca/support</a>.</p></td></tr><tr><td style="background:#0A0F1E;padding:32px 40px;text-align:center"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 8px;line-height:1.5">Zeniva LLC &middot; 8 The Green, Ste A &middot; Dover, DE 19901 &middot; USA</p><p style="margin:0"><a href="https://zenipay.ca/unsubscribe" style="color:rgba(255,255,255,0.4);font-size:11px;text-decoration:underline">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>`,
  },
  {
    id: "cold_outreach",
    name: "Cold Outreach — Free to Start",
    subject: "Accept Payments with ZeniPay — Free to Start",
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>ZeniPay for {{BUSINESS_NAME}}</title></head><body style="margin:0;padding:0;background:#f4f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa"><tr><td align="center" style="padding:40px 20px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)"><tr><td style="background:#0A0F1E;padding:32px 40px;text-align:center"><img src="https://zenipay.ca/zenipay-logo-nobg.png" alt="ZeniPay" width="150" style="margin-bottom:0"></td></tr><tr><td style="padding:40px"><h1 style="font-size:24px;color:#0A0F1E;margin:0 0 20px;font-weight:800">Accept Payments — Free to Start</h1><p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 16px">Hi {{BUSINESS_NAME}} team,</p><p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 24px">We noticed <strong>{{WEBSITE}}</strong> online and thought ZeniPay could be a great fit for your payment processing. We help businesses like yours accept payments faster and cheaper.</p><h2 style="font-size:18px;color:#0A0F1E;margin:0 0 16px;font-weight:700">Why ZeniPay?</h2><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:24px"><tr><td style="padding:16px;background:#f8fafc;border-radius:10px;border:1px solid #e2e8f0"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0"><strong style="color:#0A0F1E;font-size:14px">Simple pricing</strong><span style="float:right;color:#2DBE60;font-weight:700;font-size:14px">2.9% + $0.30</span></td></tr><tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0"><strong style="color:#0A0F1E;font-size:14px">Payouts</strong><span style="float:right;color:#15B8C9;font-weight:700;font-size:14px">Instant</span></td></tr><tr><td style="padding:8px 0;border-bottom:1px solid #e2e8f0"><strong style="color:#0A0F1E;font-size:14px">PCI Compliant</strong><span style="float:right;color:#7B4FBF;font-weight:700;font-size:14px">Yes</span></td></tr><tr><td style="padding:8px 0"><strong style="color:#0A0F1E;font-size:14px">Setup fees</strong><span style="float:right;color:#2DBE60;font-weight:700;font-size:14px">$0</span></td></tr></table></td></tr></table><h2 style="font-size:18px;color:#0A0F1E;margin:0 0 16px;font-weight:700">ZeniPay vs Competitors</h2><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;border:1px solid #e2e8f0;border-radius:10px;overflow:hidden"><tr style="background:#0A0F1E"><td style="padding:10px 16px;color:white;font-size:12px;font-weight:700">Feature</td><td style="padding:10px 16px;color:#2DBE60;font-size:12px;font-weight:700;text-align:center">ZeniPay</td><td style="padding:10px 16px;color:#94a3b8;font-size:12px;font-weight:700;text-align:center">Stripe</td><td style="padding:10px 16px;color:#94a3b8;font-size:12px;font-weight:700;text-align:center">Square</td></tr><tr><td style="padding:10px 16px;font-size:13px;border-bottom:1px solid #f1f5f9">Rate</td><td style="padding:10px 16px;font-size:13px;text-align:center;color:#2DBE60;font-weight:700;border-bottom:1px solid #f1f5f9">2.9% + $0.30</td><td style="padding:10px 16px;font-size:13px;text-align:center;color:#64748b;border-bottom:1px solid #f1f5f9">2.9% + $0.30</td><td style="padding:10px 16px;font-size:13px;text-align:center;color:#64748b;border-bottom:1px solid #f1f5f9">2.6% + $0.10</td></tr><tr><td style="padding:10px 16px;font-size:13px;border-bottom:1px solid #f1f5f9">Payouts</td><td style="padding:10px 16px;font-size:13px;text-align:center;color:#2DBE60;font-weight:700;border-bottom:1px solid #f1f5f9">Instant</td><td style="padding:10px 16px;font-size:13px;text-align:center;color:#64748b;border-bottom:1px solid #f1f5f9">2 days</td><td style="padding:10px 16px;font-size:13px;text-align:center;color:#64748b;border-bottom:1px solid #f1f5f9">1-2 days</td></tr><tr><td style="padding:10px 16px;font-size:13px">Monthly fee</td><td style="padding:10px 16px;font-size:13px;text-align:center;color:#2DBE60;font-weight:700">$0</td><td style="padding:10px 16px;font-size:13px;text-align:center;color:#64748b">$0</td><td style="padding:10px 16px;font-size:13px;text-align:center;color:#64748b">$0</td></tr></table><div style="text-align:center;margin:32px 0"><a href="https://zenipay.ca/signup" style="display:inline-block;background:linear-gradient(135deg,#2DBE60,#15B8C9,#7B4FBF);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700">Create your free account &rarr;</a></div><p style="font-size:14px;color:#64748b;line-height:1.6;margin:24px 0 0">Questions? Just reply to this email — we are here to help.</p><p style="font-size:14px;color:#64748b;margin:8px 0 0">Best,<br><strong>Alexandre</strong><br>ZeniPay Team</p></td></tr><tr><td style="background:#0A0F1E;padding:32px 40px;text-align:center"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 8px;line-height:1.5">Zeniva LLC &middot; 8 The Green, Ste A &middot; Dover, DE 19901 &middot; USA</p><p style="margin:0"><a href="https://zenipay.ca/unsubscribe" style="color:rgba(255,255,255,0.4);font-size:11px;text-decoration:underline">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>`,
  },
  {
    id: "sandbox_ready",
    name: "Your Sandbox is Ready",
    subject: "Your ZeniPay Sandbox is Ready — Test Now!",
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Your Sandbox is Ready</title></head><body style="margin:0;padding:0;background:#f4f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa"><tr><td align="center" style="padding:40px 20px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)"><tr><td style="background:linear-gradient(135deg,#15B8C9,#2DBE60);padding:40px;text-align:center"><img src="https://zenipay.ca/zenipay-logo-nobg.png" alt="ZeniPay" width="150" style="margin-bottom:20px"><h1 style="color:#ffffff;font-size:26px;margin:0 0 8px;font-weight:800">Your Sandbox is Ready!</h1><p style="color:rgba(255,255,255,0.9);font-size:15px;margin:0">Test payments without risking a cent</p></td></tr><tr><td style="padding:40px"><p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 24px">Your ZeniPay sandbox environment is active and waiting for you. Here is how to test your first payment in 3 simple steps:</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px"><tr><td style="padding:20px;background:linear-gradient(135deg,rgba(45,190,96,0.08),rgba(45,190,96,0.02));border-radius:12px;margin-bottom:12px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:top;padding-right:16px"><div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#2DBE60,#15B8C9);color:white;font-size:16px;font-weight:800;text-align:center;line-height:36px">1</div></td><td><strong style="color:#0A0F1E;font-size:15px;display:block;margin-bottom:4px">Create a Pay Link</strong><p style="margin:0;color:#475569;font-size:14px;line-height:1.5">Go to your dashboard and create a payment link for any amount.</p></td></tr></table></td></tr><tr><td style="height:12px"></td></tr><tr><td style="padding:20px;background:linear-gradient(135deg,rgba(21,184,201,0.08),rgba(21,184,201,0.02));border-radius:12px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:top;padding-right:16px"><div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#15B8C9,#7B4FBF);color:white;font-size:16px;font-weight:800;text-align:center;line-height:36px">2</div></td><td><strong style="color:#0A0F1E;font-size:15px;display:block;margin-bottom:4px">Test Payment</strong><p style="margin:0;color:#475569;font-size:14px;line-height:1.5">Use these test card numbers:</p><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:12px;margin-top:8px;font-family:monospace;font-size:13px"><div style="margin-bottom:4px"><strong>Visa:</strong> 4000 0000 0000 0002</div><div style="margin-bottom:4px"><strong>Mastercard:</strong> 5200 0000 0000 0007</div><div><strong>Exp:</strong> 12/28 &nbsp; <strong>CVV:</strong> 123</div></div></td></tr></table></td></tr><tr><td style="height:12px"></td></tr><tr><td style="padding:20px;background:linear-gradient(135deg,rgba(123,79,191,0.08),rgba(123,79,191,0.02));border-radius:12px"><table role="presentation" cellpadding="0" cellspacing="0"><tr><td style="vertical-align:top;padding-right:16px"><div style="width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#7B4FBF,#E5247B);color:white;font-size:16px;font-weight:800;text-align:center;line-height:36px">3</div></td><td><strong style="color:#0A0F1E;font-size:15px;display:block;margin-bottom:4px">Go Live</strong><p style="margin:0;color:#475569;font-size:14px;line-height:1.5">Once you are satisfied, switch to live mode and start accepting real payments.</p></td></tr></table></td></tr></table><div style="text-align:center;margin:32px 0"><a href="https://zenipay.ca/dashboard" style="display:inline-block;background:linear-gradient(135deg,#2DBE60,#15B8C9,#7B4FBF);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700">Test your first payment &rarr;</a></div><p style="font-size:14px;color:#64748b;line-height:1.6;margin:24px 0 0">Need help? Our team is here — just reply to this email.</p></td></tr><tr><td style="background:#0A0F1E;padding:32px 40px;text-align:center"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 8px;line-height:1.5">Zeniva LLC &middot; 8 The Green, Ste A &middot; Dover, DE 19901 &middot; USA</p><p style="margin:0"><a href="https://zenipay.ca/unsubscribe" style="color:rgba(255,255,255,0.4);font-size:11px;text-decoration:underline">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>`,
  },
  {
    id: "go_live",
    name: "Go Live Reminder",
    subject: "Time to Go Live — Accept Real Payments",
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Go Live with ZeniPay</title></head><body style="margin:0;padding:0;background:#f4f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa"><tr><td align="center" style="padding:40px 20px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)"><tr><td style="background:#0A0F1E;padding:40px;text-align:center"><img src="https://zenipay.ca/zenipay-logo-nobg.png" alt="ZeniPay" width="150" style="margin-bottom:20px"><h1 style="color:#ffffff;font-size:26px;margin:0 0 8px;font-weight:800">Time to Go Live!</h1><p style="color:rgba(255,255,255,0.7);font-size:15px;margin:0">You tested successfully — accept real payments now</p></td></tr><tr><td style="padding:40px"><div style="background:linear-gradient(135deg,rgba(45,190,96,0.1),rgba(21,184,201,0.1));border:2px solid #2DBE60;border-radius:12px;padding:20px;text-align:center;margin-bottom:28px"><div style="font-size:32px;margin-bottom:8px">&#10003;</div><p style="font-size:16px;color:#2DBE60;font-weight:700;margin:0">Sandbox Testing Complete</p><p style="font-size:14px;color:#475569;margin:8px 0 0">Your test transactions processed successfully. You are ready.</p></div><p style="font-size:16px;color:#334155;line-height:1.6;margin:0 0 24px">Switching to live mode takes about 5 minutes. Here is what changes:</p><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px"><tr><td style="width:50%;padding:16px;vertical-align:top"><h3 style="font-size:14px;color:#2DBE60;margin:0 0 8px">What stays the same</h3><ul style="margin:0;padding:0 0 0 16px;color:#475569;font-size:14px;line-height:1.8"><li>Same API keys format</li><li>Same dashboard</li><li>Same integration code</li><li>Same pricing: 2.9% + $0.30</li></ul></td><td style="width:50%;padding:16px;vertical-align:top"><h3 style="font-size:14px;color:#7B4FBF;margin:0 0 8px">What changes</h3><ul style="margin:0;padding:0 0 0 16px;color:#475569;font-size:14px;line-height:1.8"><li>Real transactions</li><li>Real money deposited</li><li>Instant payouts enabled</li><li>Live webhook events</li></ul></td></tr></table><div style="text-align:center;margin:32px 0"><a href="https://zenipay.ca/dashboard/settings" style="display:inline-block;background:linear-gradient(135deg,#2DBE60,#15B8C9,#7B4FBF);color:#ffffff;text-decoration:none;padding:16px 40px;border-radius:12px;font-size:16px;font-weight:700">Switch to Live Mode &rarr;</a></div><p style="font-size:14px;color:#64748b;line-height:1.6;margin:24px 0 0">Questions about going live? Reply here or check our <a href="https://zenipay.ca/docs/go-live" style="color:#15B8C9;text-decoration:none">go-live guide</a>.</p></td></tr><tr><td style="background:#0A0F1E;padding:32px 40px;text-align:center"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 8px;line-height:1.5">Zeniva LLC &middot; 8 The Green, Ste A &middot; Dover, DE 19901 &middot; USA</p><p style="margin:0"><a href="https://zenipay.ca/unsubscribe" style="color:rgba(255,255,255,0.4);font-size:11px;text-decoration:underline">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>`,
  },
  {
    id: "generic_pitch",
    name: "ZeniPay for Your Business",
    subject: "The Modern Way to Accept Payments",
    html: `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>ZeniPay for Your Business</title></head><body style="margin:0;padding:0;background:#f4f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f7fa"><tr><td align="center" style="padding:40px 20px"><table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08)"><tr><td style="padding:40px 40px 0;text-align:center"><img src="https://zenipay.ca/zenipay-logo-nobg.png" alt="ZeniPay" width="140" style="margin-bottom:32px"><h1 style="font-size:28px;color:#0A0F1E;margin:0 0 8px;font-weight:800">The modern way to<br>accept payments</h1><p style="font-size:16px;color:#64748b;margin:0 0 32px">Simple, fast, and built for businesses like {{BUSINESS_NAME}}</p></td></tr><tr><td style="padding:0 40px"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td style="width:33%;padding:16px;text-align:center;vertical-align:top"><div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#2DBE60,#15B8C9);margin:0 auto 12px;line-height:48px;font-size:20px">&#9889;</div><strong style="color:#0A0F1E;font-size:14px;display:block;margin-bottom:4px">All Major Cards</strong><p style="color:#64748b;font-size:12px;margin:0;line-height:1.4">Visa, Mastercard, Amex, Discover</p></td><td style="width:33%;padding:16px;text-align:center;vertical-align:top"><div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#15B8C9,#7B4FBF);margin:0 auto 12px;line-height:48px;font-size:20px">&#127760;</div><strong style="color:#0A0F1E;font-size:14px;display:block;margin-bottom:4px">135+ Currencies</strong><p style="color:#64748b;font-size:12px;margin:0;line-height:1.4">Accept payments worldwide</p></td><td style="width:33%;padding:16px;text-align:center;vertical-align:top"><div style="width:48px;height:48px;border-radius:12px;background:linear-gradient(135deg,#7B4FBF,#E5247B);margin:0 auto 12px;line-height:48px;font-size:20px">&#128640;</div><strong style="color:#0A0F1E;font-size:14px;display:block;margin-bottom:4px">Zero-Day Hold</strong><p style="color:#64748b;font-size:12px;margin:0;line-height:1.4">Instant access to your funds</p></td></tr></table></td></tr><tr><td style="padding:32px 40px"><div style="background:#f8fafc;border-radius:12px;padding:24px;text-align:center;border:1px solid #e2e8f0"><p style="font-size:13px;color:#64748b;margin:0 0 4px;text-transform:uppercase;letter-spacing:0.05em;font-weight:600">Simple pricing</p><div style="font-size:36px;font-weight:800;color:#0A0F1E;margin:8px 0">2.9% <span style="font-size:20px;color:#64748b;font-weight:400">+</span> $0.30</div><p style="font-size:14px;color:#64748b;margin:4px 0 0">per successful transaction. No monthly fees. No hidden costs.</p></div></td></tr><tr><td style="padding:0 40px 40px"><div style="text-align:center;margin:8px 0 32px"><a href="https://zenipay.ca/signup" style="display:inline-block;background:linear-gradient(135deg,#2DBE60,#15B8C9,#7B4FBF);color:#ffffff;text-decoration:none;padding:16px 48px;border-radius:12px;font-size:16px;font-weight:700">Get started free &rarr;</a></div><p style="font-size:13px;color:#94a3b8;text-align:center;margin:0">No credit card required. Start in sandbox, go live when ready.</p></td></tr><tr><td style="background:#0A0F1E;padding:32px 40px;text-align:center"><p style="color:rgba(255,255,255,0.5);font-size:12px;margin:0 0 8px;line-height:1.5">Zeniva LLC &middot; 8 The Green, Ste A &middot; Dover, DE 19901 &middot; USA</p><p style="margin:0"><a href="https://zenipay.ca/unsubscribe" style="color:rgba(255,255,255,0.4);font-size:11px;text-decoration:underline">Unsubscribe</a></p></td></tr></table></td></tr></table></body></html>`,
  },
];

export default function AdminPage() {
  const router = useRouter();
  const { t } = useT();
  const [tab, setTab]               = useState<TabKey>("overview");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [copiedKey, setCopiedKey]   = useState("");
  const [clientView, setClientView] = useState<string | null>(null);
  const [signups, setSignups]       = useState<any[]>([]);
  const [adminStats, setAdminStats] = useState<any>(null);
  const [billingInvoices, setBillingInvoices] = useState<any[]>([]);
  const [cashbackData, setCashbackData] = useState<Record<string,unknown> | null>(null);
  const [billingLoading, setBillingLoading]   = useState(false);
  const [billingForm, setBillingForm]         = useState<{ open: boolean; merchant_id: string; merchant_name: string; period_start: string; period_end: string }>({ open: false, merchant_id: "", merchant_name: "", period_start: "", period_end: "" });

  // Merchant review state
  const [reviewMerchant, setReviewMerchant] = useState<any>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [reviewLoading, setReviewLoading] = useState(false);
  const [showRejectInput, setShowRejectInput] = useState(false);

  // Toast state
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const showToast = (msg: string, type: "success" | "error" = "success") => { setToast({ msg, type }); setTimeout(() => setToast(null), 3500); };

  // Overview state
  const [overviewRange, setOverviewRange] = useState<number>(14);
  const [testingConnection, setTestingConnection] = useState(false);

  // Clients state
  const [clientSearch, setClientSearch] = useState("");
  const [clientFilter, setClientFilter] = useState<"all" | "active" | "sandbox" | "suspended">("all");
  const [clientSort, setClientSort] = useState<"volume" | "balance" | "recent" | "name">("volume");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [planDropdown, setPlanDropdown] = useState<string | null>(null);

  // Transactions state
  const [txSearch, setTxSearch] = useState("");
  const [txStatusFilter, setTxStatusFilter] = useState("all");
  const [txMerchantFilter, setTxMerchantFilter] = useState("all");
  const [txDateRange, setTxDateRange] = useState("all");
  const [txExpanded, setTxExpanded] = useState<string | null>(null);
  const [refundLoading, setRefundLoading] = useState<string | null>(null);

  // Payouts state
  const [payoutForm, setPayoutForm] = useState({ merchant_id: "", amount: "", method: "ach" as "ach" | "wire", note: "" });
  const [payoutLoading, setPayoutLoading] = useState(false);

  // Billing state
  const [billingSearch, setBillingSearch] = useState("");
  const [billingStatusFilter, setBillingStatusFilter] = useState("all");

  // Ben AI Chat state
  const [benOpen, setBenOpen] = useState(false);
  const [benMsg, setBenMsg] = useState("");
  const [benChat, setBenChat] = useState<{role:string;text:string}[]>([]);
  const [benLoading, setBenLoading] = useState(false);

  // Marketing state
  const [marketingAudience, setMarketingAudience] = useState("sandbox");
  const [marketingSubject, setMarketingSubject] = useState("");
  const [marketingBody, setMarketingBody] = useState("");
  const [marketingSending, setMarketingSending] = useState(false);
  const [marketingSent, setMarketingSent] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  // Lead Hunter state
  const [scrapeQuery, setScrapeQuery] = useState("shopify store accepting payments");
  const [scrapeLoading, setScrapeLoading] = useState(false);
  const [scrapedLeads, setScrapedLeads] = useState<any[]>([]);
  const [leadPitchSending, setLeadPitchSending] = useState<string | null>(null);
  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualLead, setManualLead] = useState({ business_name: "", email: "", website: "", phone: "", sector: "E-commerce", notes: "", description: "" });
  const [leadStatusFilter, setLeadStatusFilter] = useState<"all" | "new" | "contacted" | "converted" | "lost">("all");

  // Settings state
  const [settings, setSettings] = useState({
    platformName: "ZeniPay",
    adminEmail: "admin@zenipay.ca",
    supportUrl: "https://zenipay.ca/support",
    standardPct: "2.90",
    standardPerTx: "0.30",
    businessPct: "2.50",
    businessPerTx: "0.25",
    completePct: "2.00",
    completePerTx: "0.20",
  });
  const [settingsLoading, setSettingsLoading] = useState(false);
  const [finixTestResult, setFinixTestResult] = useState<"success" | "fail" | null>(null);

  // Mobile responsive state
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const loadMerchants = useCallback(() => {
    fetch("/api/zenipay/merchants")
      .then(r => r.json())
      .then(data => {
        if (data.merchants) {
          setSignups(data.merchants.map((m: any) => ({
            id: m.id,
            businessName:  m.business_name,
            ownerName:     m.owner_name,
            email:         m.email,
            phone:         m.phone,
            website:       m.website,
            businessType:  m.business_type,
            country:       m.country,
            monthlyVolume: m.monthly_volume,
            status:        m.status,
            plan:          m.plan,
            sandboxKey:    m.sandbox_key,
            sandboxSecret: m.sandbox_secret,
            liveKey:       m.live_key,
            createdAt:     m.created_at,
            volume:        m.volume,
            txCount:       m.tx_count,
            balance:       m.balance,
            notes:         m.notes,
            onboarding_state: m.onboarding_state || m.onboardingState || null,
            merchant_data:    m.merchant_data || m.merchantData || null,
          })));
        }
      })
      .catch(err => console.error("[Admin] Failed to load merchants:", err));
  }, []);

  const loadStats = useCallback(() => {
    fetch("/api/zenipay/stats")
      .then(r => r.json())
      .then(data => setAdminStats(data))
      .catch(err => console.error("[Admin] Failed to load stats:", err));
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      if (!sessionStorage.getItem("zp_admin")) { router.replace("/admin/login"); return; }
    }
    loadMerchants();
    loadStats();
    fetch("/api/zenipay/cashback").then(r=>r.json()).then(d=>setCashbackData(d)).catch(()=>{});
    fetch("/api/zenipay/admin/billing")
      .then(r => r.json())
      .then(data => { if (data.invoices) setBillingInvoices(data.invoices); })
      .catch(err => console.error("[Admin] Failed to load billing:", err));
    fetch("/api/zenipay/admin/scrape").then(r => r.json()).then(d => setScrapedLeads(d.leads || [])).catch(() => {});
  }, [router, loadMerchants, loadStats]);

  const CLIENTS = [
    ...CLIENTS_DEFAULT,
    ...signups.map((s: any) => ({
      id: s.id,
      name: s.businessName || s.business_name || "—",
      domain: s.website || "—",
      status: s.status || "sandbox",
      volume:  Number(s.volume) || 0,
      txCount: Number(s.txCount ?? s.tx_count) || 0,
      balance: Number(s.balance) || 0,
      apiKey: s.liveKey || s.live_key || "—",
      sandboxKey: s.sandboxKey || s.sandbox_key || "—",
      plan: s.plan || "Sandbox",
      since: (s.createdAt || s.created_at || "—").slice(0, 10),
      contact: s.email,
      gateway: (s.status === "active" || s.status === "live") ? "Finix (Live)" : "Sandbox",
      bankAccount: "—",
      description: s.businessType || s.business_type || s.notes || "New signup",
      ownerName: s.ownerName || s.owner_name || "—",
      phone: s.phone || "—",
      country: s.country || "—",
      monthlyVolume: s.monthlyVolume || s.monthly_volume || "—",
      notes: s.notes || "",
      createdAt: s.createdAt || s.created_at || "—",
      onboarding_state: s.onboarding_state || null,
      merchant_data: s.merchant_data || null,
    })),
  ];

  const logout  = () => { sessionStorage.removeItem("zp_admin"); router.replace("/admin/login"); };
  const copyKey = (key: string) => { navigator.clipboard.writeText(key).then(() => { setCopiedKey(key); setTimeout(() => setCopiedKey(""), 1800); }); };

  // Admin actions helper
  const adminAction = async (body: Record<string, any>, successMsg: string) => {
    setActionLoading(body.merchant_id || "global");
    try {
      const res = await fetch("/api/zenipay/admin/actions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        showToast(successMsg, "success");
        loadMerchants();
        loadStats();
      } else {
        showToast(data.error || t("admin.actionFailed"), "error");
      }
    } catch {
      showToast(t("admin.networkError"), "error");
    } finally {
      setActionLoading(null);
      setPlanDropdown(null);
    }
  };

  // CSV export helper
  const downloadCSV = (filename: string, headers: string[], rows: string[][]) => {
    const csv = [headers.join(","), ...rows.map(r => r.map(c => `"${String(c ?? "").replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename; a.click();
    URL.revokeObjectURL(url);
  };

  // Ben AI handler
  const handleBenSend = async () => {
    if (!benMsg.trim()) return;
    const userMsg = benMsg;
    setBenMsg("");
    setBenChat(prev => [...prev, { role: "user", text: userMsg }]);
    setBenLoading(true);
    await new Promise(r => setTimeout(r, 600));

    const q = userMsg.toLowerCase();
    const clientCount = CLIENTS.length;
    const totalVolume = CLIENTS.reduce((s: number, c: any) => s + (Number(c.volume) || Number(c.balance) || 0), 0);
    const sandboxCount = CLIENTS.filter((c: any) => c.status === "sandbox").length;
    const liveCount = CLIENTS.filter((c: any) => c.status === "active" || c.status === "live").length;

    let reply = "";
    if (q.includes("client") || q.includes("merchant")) {
      reply = `📊 Merchant Summary\n\n• Total Merchants: ${clientCount}\n• Live: ${liveCount}\n• Sandbox: ${sandboxCount}\n• Total Volume: $${totalVolume.toLocaleString()}\n\nUse the Clients tab to manage merchants.`;
    } else if (q.includes("revenue") || q.includes("fee") || q.includes("money")) {
      const fees = totalVolume * 0.029 + clientCount * 0.30;
      reply = `💰 Revenue\n\n• Platform Volume: $${totalVolume.toLocaleString()}\n• ZeniPay Fees (2.9%+$0.30): $${fees.toFixed(2)}\n• Active Merchants: ${liveCount}`;
    } else if (q.includes("lead") || q.includes("scrape") || q.includes("prospect")) {
      reply = `🎯 Lead Hunting\n\nGo to the Lead Hunter tab to:\n• Scrape business leads from Google\n• Save leads to your pipeline\n• Send ZeniPay pitch emails\n\nTip: Search for "shopify store" or "e-commerce business" to find prospects.`;
    } else if (q.includes("campaign") || q.includes("email") || q.includes("marketing")) {
      reply = `📧 Marketing\n\nGo to the Marketing tab to:\n• Send campaigns to sandbox merchants\n• Send pitch emails to scraped leads\n• Track sent/failed counts\n\nAll emails sent via info@zeniva.ca with anti-spam compliance.`;
    } else if (q.includes("help") || q.includes("aide")) {
      reply = `🤖 Ben AI — Admin Commands\n\n• "clients" — merchant summary\n• "revenue" — fees & volume\n• "leads" — lead hunting tips\n• "marketing" — campaign info\n• "help" — this menu`;
    } else {
      reply = `📊 Quick Admin Overview\n\n• ${clientCount} merchants (${liveCount} live, ${sandboxCount} sandbox)\n• Volume: $${totalVolume.toLocaleString()}\n\nType "help" for all commands.`;
    }

    setBenChat(prev => [...prev, { role: "ben", text: reply }]);
    setBenLoading(false);
  };

  // Marketing handler
  const handleSendCampaign = async () => {
    setMarketingSending(true);
    setMarketingSent(0);
    try {
      const res = await fetch("/api/zenipay/admin/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience: marketingAudience, subject: marketingSubject, html_body: marketingBody }),
      });
      const data = await res.json();
      setMarketingSent(data.sent || 0);
      showToast(data.sent ? `${data.sent} emails sent!` : "Campaign sent");
    } catch { showToast("Failed to send", "error"); }
    setMarketingSending(false);
  };

  // Lead Hunter handlers
  const handleScrape = async () => {
    setScrapeLoading(true);
    try {
      const res = await fetch("/api/zenipay/admin/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: scrapeQuery }),
      });
      const data = await res.json();
      setScrapedLeads(data.leads || []);
      showToast(`Found ${data.new_count || 0} new leads (${(data.leads || []).length} total)`);
    } catch { showToast("Scrape failed", "error"); }
    setScrapeLoading(false);
  };

  const handleManualAddLead = async () => {
    if (!manualLead.business_name) { showToast("Business name required", "error"); return; }
    try {
      const res = await fetch("/api/zenipay/admin/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "manual_add", ...manualLead }),
      });
      const data = await res.json();
      setScrapedLeads(data.leads || []);
      setManualLead({ business_name: "", email: "", website: "", phone: "", sector: "E-commerce", notes: "", description: "" });
      setShowManualAdd(false);
      showToast("Lead added");
    } catch { showToast("Failed to add lead", "error"); }
  };

  const handleUpdateLeadStatus = async (id: string, status: string) => {
    try {
      const res = await fetch("/api/zenipay/admin/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_lead", id, status }),
      });
      const data = await res.json();
      setScrapedLeads(data.leads || []);
    } catch { showToast("Update failed", "error"); }
  };

  const handleDeleteLead = async (id: string) => {
    try {
      const res = await fetch("/api/zenipay/admin/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete_lead", id }),
      });
      const data = await res.json();
      setScrapedLeads(data.leads || []);
      showToast("Lead deleted");
    } catch { showToast("Delete failed", "error"); }
  };

  const handleSendPitch = async (lead: any) => {
    setLeadPitchSending(lead.id);
    try {
      // Use the generic pitch template with personalization
      const pitchHtml = EMAIL_TEMPLATES.find(t => t.id === "generic_pitch")?.html
        .replace(/\{\{BUSINESS_NAME\}\}/g, lead.business_name || "there")
        .replace(/\{\{WEBSITE\}\}/g, lead.website || "your website")
        || `<h2>Hi ${lead.business_name || "there"},</h2><p>I noticed your business and thought ZeniPay could help you accept payments online.</p><p>ZeniPay is a modern payment platform — accept Visa, Mastercard, ACH, and more. Free to start, 2.9% + $0.30 per transaction.</p><p><a href="https://zenipay.ca/signup">Get started free</a></p><p>– Alexandre, ZeniPay</p>`;
      await fetch("/api/zenipay/admin/marketing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ audience: "single", to: lead.email, subject: "Accept Payments with ZeniPay — Free to Start", html_body: pitchHtml }),
      });
      // Update status to contacted
      await fetch("/api/zenipay/admin/scrape", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "update_lead", id: lead.id, status: "contacted" }),
      });
      setScrapedLeads(prev => prev.map(l => l.id === lead.id ? { ...l, status: "contacted" } : l));
      showToast("Pitch sent to " + lead.email);
    } catch { showToast("Failed", "error"); }
    setLeadPitchSending(null);
  };

  const handleSelectTemplate = (templateId: string) => {
    setSelectedTemplate(templateId);
    const tpl = EMAIL_TEMPLATES.find(t => t.id === templateId);
    if (tpl) {
      setMarketingSubject(tpl.subject);
      setMarketingBody(tpl.html);
    }
  };

  const BG      = "#F1F5F9";
  const SURFACE = "#FFFFFF";
  const BORDER  = "rgba(0,0,0,0.07)";
  const TEXT    = "#0F172A";
  const MUTED   = "#64748B";
  const LIGHT   = "#F8FAFC";

  const card  = (extra?: React.CSSProperties): React.CSSProperties => ({ background: SURFACE, borderRadius: 16, border: `1px solid ${BORDER}`, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", ...extra });
  const badge = (s: string): React.CSSProperties => ({ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: STATUS_BG[s] ?? STATUS_BG.inactive, color: STATUS_COLOR[s] ?? STATUS_COLOR.inactive, border: `1px solid ${(STATUS_COLOR[s] ?? STATUS_COLOR.inactive)}33`, letterSpacing: "0.04em" });
  const inputStyle: React.CSSProperties = { padding: "9px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13, background: SURFACE, color: TEXT, outline: "none", fontFamily: "inherit" };

  const currentTab = NAV.find(n => n.key === tab)!;

  const Avatar = ({ name, size = 40, grad = false }: { name: string; size?: number; grad?: boolean }) => (
    <div style={{ width: size, height: size, borderRadius: size * 0.28, flexShrink: 0, background: grad ? ZP_GRAD : `linear-gradient(135deg, ${ZP_CYAN}44, ${ZP_PURPLE}44)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: size * 0.38, color: grad ? "#fff" : ZP_PURPLE }}>
      {name.charAt(0).toUpperCase()}
    </div>
  );

  const MetricCard = ({ label, value, sub, accent, icon }: { label: string; value: string; sub: string; accent: string; icon: string }) => (
    <div style={{ ...card(), overflow: "hidden" }}>
      <div style={{ height: 4, background: accent, borderRadius: "16px 16px 0 0" }} />
      <div style={{ padding: "18px 20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>{label}</div>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: accent + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>{icon}</div>
        </div>
        <div style={{ fontSize: 26, fontWeight: 900, color: accent, letterSpacing: "-0.5px", marginBottom: 4 }}>{value}</div>
        <div style={{ fontSize: 11, color: MUTED }}>{sub}</div>
      </div>
    </div>
  );

  // Spinner component
  const Spinner = ({ size = 16, color = ZP_GREEN }: { size?: number; color?: string }) => (
    <div style={{ width: size, height: size, border: `2px solid ${color}33`, borderTop: `2px solid ${color}`, borderRadius: "50%", animation: "spin 0.6s linear infinite", display: "inline-block" }} />
  );

  // --- Data helpers ---

  // Overview: group transactions by day for chart
  const getRevenueByDay = (days: number) => {
    const txs = adminStats?.recent_transactions || [];
    const now = new Date();
    const cutoff = new Date(now.getTime() - days * 86400000);
    const dayMap: Record<string, number> = {};
    for (let i = 0; i < days; i++) {
      const d = new Date(now.getTime() - i * 86400000);
      dayMap[d.toISOString().slice(0, 10)] = 0;
    }
    txs.forEach((t: any) => {
      if (!t.date) return;
      const d = new Date(t.date);
      if (d >= cutoff) {
        const key = d.toISOString().slice(0, 10);
        if (key in dayMap) dayMap[key] += Number(t.amount) || 0;
      }
    });
    return Object.entries(dayMap).sort(([a], [b]) => a.localeCompare(b)).map(([date, vol]) => ({ date, vol }));
  };

  // Overview: top 5 clients by volume
  const top5Clients = [...CLIENTS].sort((a, b) => b.volume - a.volume).slice(0, 5);
  const maxVolume = top5Clients.length > 0 ? top5Clients[0].volume : 1;

  // Overview: recent activity feed (combine txs + signups)
  const getActivityFeed = () => {
    const items: { type: "tx" | "signup"; text: string; date: string; color: string }[] = [];
    (adminStats?.recent_transactions || []).slice(0, 6).forEach((t: any) => {
      items.push({ type: "tx", text: `${t.customer || "Payment"} — ${fmt(Number(t.amount))} (${t.status})`, date: t.date || "", color: t.status === "succeeded" ? ZP_GREEN : t.status === "failed" ? "#DC2626" : "#D97706" });
    });
    CLIENTS.slice(0, 4).forEach(c => {
      items.push({ type: "signup", text: `${c.name} joined — ${c.plan}`, date: c.createdAt || c.since, color: ZP_CYAN });
    });
    return items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 10);
  };

  // Transactions: filtered list
  const getFilteredTransactions = () => {
    let txs = adminStats?.recent_transactions || [];
    if (txSearch) {
      const q = txSearch.toLowerCase();
      txs = txs.filter((t: any) => (t.id || "").toLowerCase().includes(q) || (t.customer || "").toLowerCase().includes(q) || (t.email || "").toLowerCase().includes(q) || String(t.amount).includes(q));
    }
    if (txStatusFilter !== "all") txs = txs.filter((t: any) => t.status === txStatusFilter);
    if (txMerchantFilter !== "all") txs = txs.filter((t: any) => (t.merchant_id || t.merchant) === txMerchantFilter);
    if (txDateRange !== "all") {
      const days = txDateRange === "7d" ? 7 : txDateRange === "30d" ? 30 : 90;
      const cutoff = new Date(Date.now() - days * 86400000);
      txs = txs.filter((t: any) => t.date && new Date(t.date) >= cutoff);
    }
    return txs;
  };

  // Clients: filtered + sorted
  const getFilteredClients = () => {
    let list = [...CLIENTS];
    if (clientSearch) {
      const q = clientSearch.toLowerCase();
      list = list.filter(c => c.name.toLowerCase().includes(q) || (c.contact || "").toLowerCase().includes(q) || c.id.toLowerCase().includes(q));
    }
    if (clientFilter === "active") list = list.filter(c => c.status === "active" || c.status === "live");
    else if (clientFilter === "sandbox") list = list.filter(c => c.status === "sandbox");
    else if (clientFilter === "suspended") list = list.filter(c => c.status === "suspended" || c.status === "inactive");
    if (clientSort === "volume") list.sort((a, b) => b.volume - a.volume);
    else if (clientSort === "balance") list.sort((a, b) => b.balance - a.balance);
    else if (clientSort === "recent") list.sort((a, b) => new Date(b.createdAt || b.since).getTime() - new Date(a.createdAt || a.since).getTime());
    else if (clientSort === "name") list.sort((a, b) => a.name.localeCompare(b.name));
    return list;
  };

  // Billing: filtered
  const getFilteredInvoices = () => {
    let list = [...billingInvoices];
    if (billingSearch) {
      const q = billingSearch.toLowerCase();
      list = list.filter((i: any) => (i.merchant_name || "").toLowerCase().includes(q) || (i.invoice_number || "").toLowerCase().includes(q));
    }
    if (billingStatusFilter !== "all") list = list.filter((i: any) => i.status === billingStatusFilter);
    return list;
  };

  const filteredTxs = getFilteredTransactions();
  const txTotalVolume = filteredTxs.reduce((a: number, t: any) => a + Number(t.amount || 0), 0);

  return (
    <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Inter', system-ui, sans-serif", display: "flex" }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: "fixed", top: 24, right: 24, zIndex: 9999, padding: "14px 24px", borderRadius: 12, background: toast.type === "success" ? ZP_GREEN : "#DC2626", color: "#fff", fontWeight: 700, fontSize: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.18)", display: "flex", alignItems: "center", gap: 10, animation: "slideIn 0.3s ease" }}>
          <span style={{ fontSize: 18 }}>{toast.type === "success" ? "✓" : "✕"}</span>
          {toast.msg}
        </div>
      )}

      {/* Keyframes for spinner + toast */}
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes slideIn { from { transform: translateX(100px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @media (max-width: 768px) {
          .admin-sidebar {
            position: fixed !important;
            z-index: 1000 !important;
            height: 100vh !important;
            width: 240px !important;
            transform: translateX(-100%);
            transition: transform 0.3s ease !important;
          }
          .admin-sidebar.open { transform: translateX(0) !important; }
          .admin-overlay {
            display: block !important;
            position: fixed; inset: 0;
            background: rgba(0,0,0,0.5);
            z-index: 999;
          }
          .admin-main { margin-left: 0 !important; }
          .admin-header { padding: 0 12px !important; }
          .admin-content { padding: 14px 12px !important; }
          .admin-grid-2 { grid-template-columns: 1fr !important; }
          .admin-grid-3 { grid-template-columns: 1fr !important; }
          .admin-grid-4 { grid-template-columns: 1fr 1fr !important; }
          .admin-grid-5 { grid-template-columns: 1fr 1fr !important; }
          .admin-grid-kpi { grid-template-columns: 1fr 1fr !important; }
          .admin-grid-commission { grid-template-columns: 1fr !important; }
          .admin-filter-row { flex-direction: column !important; align-items: stretch !important; }
          .admin-filter-row > * { width: 100% !important; }
          .admin-filter-row input, .admin-filter-row select { width: 100% !important; box-sizing: border-box !important; }
          .admin-filter-row .admin-ml-auto { margin-left: 0 !important; }
          .admin-table-wrap { overflow-x: auto !important; -webkit-overflow-scrolling: touch; }
          .admin-table-wrap table { min-width: 700px; }
          .admin-client-detail-grid { grid-template-columns: 1fr !important; }
          .admin-payout-grid { grid-template-columns: 1fr !important; }
          .admin-billing-form-grid { grid-template-columns: 1fr !important; }
          .admin-settings-grid { grid-template-columns: 1fr !important; }
          .admin-client-row { flex-direction: column !important; align-items: stretch !important; }
          .admin-client-right { text-align: left !important; margin-top: 12px; }
          .admin-client-actions { justify-content: flex-start !important; }
          .admin-chart-2col { grid-template-columns: 1fr !important; }
          .admin-activity-2col { grid-template-columns: 1fr !important; }
          .admin-header-right .admin-sandbox-badge { display: none !important; }
          .admin-bank-2col { grid-template-columns: 1fr !important; }
          .admin-platform-rev-grid { grid-template-columns: 1fr !important; }
          .admin-tx-grid-header, .admin-tx-grid-row { display: none !important; }
          .admin-tx-card-mobile { display: block !important; }
          .admin-api-endpoint { flex-direction: column !important; align-items: flex-start !important; gap: 6px !important; }
          .admin-api-endpoint code { word-break: break-all !important; }
          .admin-alert-banner { flex-direction: column !important; align-items: flex-start !important; gap: 8px !important; }
          .admin-alert-banner a { align-self: flex-start; }
          .admin-header-title-extra { display: none !important; }
          .admin-client-summary-row { grid-template-columns: 1fr 1fr !important; }
          .admin-cashback-summary { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>

      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div className="admin-overlay" onClick={() => setSidebarOpen(false)} style={{ display: "block", position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 999 }} />
      )}

      {/* ── Sidebar ── */}
      <div className={`admin-sidebar${isMobile && sidebarOpen ? " open" : ""}`} style={{ width: isMobile ? 240 : (sidebarOpen ? 240 : 64), flexShrink: 0, background: SURFACE, borderRight: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", transition: isMobile ? "transform 0.3s ease" : "width 0.2s ease", overflow: "hidden", ...(isMobile ? { position: "fixed", zIndex: 1000, height: "100vh", transform: sidebarOpen ? "translateX(0)" : "translateX(-100%)" } : {}) }}>

        <div style={{ padding: "0 0 0", borderBottom: `1px solid ${BORDER}` }}>
          <div style={{ height: 60, display: "flex", alignItems: "center", padding: "0 16px", gap: 10 }}>
            <ZeniPayLogo size={36} style={{ flexShrink: 0 }} />
            {sidebarOpen && (
              <div>
                <div style={{ fontWeight: 900, fontSize: 15, background: ZP_GRAD, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", letterSpacing: "-0.3px" }}>ZeniPay</div>
                <div style={{ fontSize: 10, color: MUTED, fontWeight: 600 }}>{t("admin.console")}</div>
              </div>
            )}
          </div>
        </div>

        {sidebarOpen && (
          <div style={{ margin: "12px 10px 4px", padding: "6px 10px", borderRadius: 10, background: "rgba(217,119,6,0.07)", border: "1px solid rgba(217,119,6,0.2)", display: "flex", alignItems: "center", gap: 6 }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#D97706" }} />
            <div style={{ fontSize: 10, color: "#D97706", fontWeight: 700 }}>{t("admin.sandboxFinixActive")}</div>
          </div>
        )}

        <nav style={{ flex: 1, padding: "8px 8px" }}>
          {NAV.map(({ key, icon, label, color }) => {
            const active = tab === key;
            return (
              <button key={key} onClick={() => { setTab(key); if (isMobile) setSidebarOpen(false); }} title={label} style={{
                display: "flex", alignItems: "center", gap: 10,
                padding: (sidebarOpen || isMobile) ? "9px 12px" : "9px 0",
                justifyContent: (sidebarOpen || isMobile) ? "flex-start" : "center",
                width: "100%", border: "none", cursor: "pointer",
                background: active ? color + "12" : "transparent",
                borderRadius: 10,
                color: active ? color : MUTED,
                fontSize: 13, fontWeight: active ? 700 : 500,
                transition: "all 0.15s", textAlign: "left",
                marginBottom: 2,
              }}>
                <div style={{ width: 28, height: 28, borderRadius: 8, background: active ? color + "20" : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, flexShrink: 0, color: active ? color : MUTED, transition: "all 0.15s" }}>{icon}</div>
                {(sidebarOpen || isMobile) && <span style={{ flex: 1 }}>{t("admin.nav." + key)}</span>}
                {key === "clients" && (() => { const cnt = CLIENTS.filter((c: any) => c.onboarding_state === "provisioning" || c.merchant_data?.pending_review).length; return cnt > 0 ? <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: "#DC2626", color: "#fff", fontSize: 10, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "0 5px", marginLeft: 4 }}>{cnt}</span> : null; })()}
              </button>
            );
          })}
        </nav>

        <div style={{ padding: "8px 8px 12px", borderTop: `1px solid ${BORDER}` }}>
          {sidebarOpen && <div style={{ marginBottom: 6, display: "flex", justifyContent: "center" }}><LangToggle style={{ background: "rgba(0,0,0,0.05)", color: MUTED, border: `1px solid ${BORDER}` }} /></div>}
          <button onClick={() => setSidebarOpen(v => !v)} style={{ width: "100%", padding: "8px 0", border: "none", background: "transparent", cursor: "pointer", color: MUTED, fontSize: 16, borderRadius: 8 }} title="Toggle sidebar">
            {sidebarOpen ? "⟵" : "⟶"}
          </button>
          {sidebarOpen ? (
            <button onClick={logout} style={{ width: "100%", padding: "9px 12px", borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "1px solid rgba(220,38,38,0.15)", color: "#DC2626", cursor: "pointer", fontSize: 12, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
              <span>⏻</span> {t("admin.signOut")}
            </button>
          ) : (
            <button onClick={logout} style={{ width: "100%", padding: "8px 0", border: "none", background: "transparent", cursor: "pointer", color: "#DC2626", fontSize: 16 }} title={t("admin.signOut")}>⏻</button>
          )}
        </div>
      </div>

      {/* ── Main ── */}
      <div className="admin-main" style={{ flex: 1, overflow: "auto", display: "flex", flexDirection: "column" }}>

        <div className="admin-header" style={{ background: SURFACE, borderBottom: `1px solid ${BORDER}`, padding: isMobile ? "0 12px" : "0 28px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between", position: "sticky", top: 0, zIndex: 10, boxShadow: "0 1px 0 rgba(0,0,0,0.04)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {isMobile && (
              <button onClick={() => setSidebarOpen(v => !v)} style={{ width: 36, height: 36, borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20, color: TEXT, flexShrink: 0 }}>
                ☰
              </button>
            )}
            <div style={{ width: 28, height: 28, borderRadius: 8, background: currentTab.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, color: currentTab.color }}>{currentTab.icon}</div>
            <h1 style={{ margin: 0, fontSize: isMobile ? 14 : 16, fontWeight: 800, letterSpacing: "-0.3px" }}>{t("admin.nav." + currentTab.key)}</h1>
            <span className="admin-header-title-extra" style={{ color: BORDER, fontSize: 16 }}>·</span>
            <span className="admin-header-title-extra" style={{ fontSize: 12, color: MUTED }}>ZeniPay Platform</span>
          </div>
          <div className="admin-header-right" style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div className="admin-sandbox-badge" style={{ padding: "5px 14px", borderRadius: 8, background: "rgba(217,119,6,0.07)", border: "1px solid rgba(217,119,6,0.18)", fontSize: 11, fontWeight: 700, color: "#D97706", display: "flex", alignItems: "center", gap: 5 }}>
              <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#D97706", display: "inline-block" }} /> {t("admin.sandboxMode")}
            </div>
            <div style={{ width: 34, height: 34, borderRadius: 10, background: ZP_GRAD, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 900, fontSize: 14 }}>A</div>
          </div>
        </div>

        <div className="admin-content" style={{ padding: isMobile ? "14px 12px" : "24px 28px", flex: 1 }}>

          {/* ════════════════ OVERVIEW ════════════════ */}
          {tab === "overview" && (
            <div>
              {/* Alert banner */}
              <div className="admin-alert-banner" style={{ marginBottom: 20, padding: "12px 18px", borderRadius: 12, background: "rgba(217,119,6,0.05)", border: "1px solid rgba(217,119,6,0.2)", display: "flex", alignItems: "center", gap: 12 }}>
                <div style={{ fontSize: 20 }}>⚠️</div>
                <div style={{ flex: 1 }}>
                  <span style={{ fontWeight: 700, color: "#B45309", fontSize: 13 }}>{t("admin.overview.alertTitle")}</span>
                  <span style={{ color: "#92400E", fontSize: 13, marginLeft: 8 }}>{t("admin.overview.alertSub")}</span>
                </div>
                <a href="https://dashboard.finix.com" target="_blank" rel="noreferrer" style={{ padding: "6px 16px", borderRadius: 8, background: "#D97706", color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none", flexShrink: 0 }}>{t("admin.overview.finixDashboard")}</a>
              </div>

              {/* Pending Approvals Banner */}
              {(() => {
                const pending = CLIENTS.filter((c: any) => c.onboarding_state === "provisioning" || c.merchant_data?.pending_review);
                if (pending.length === 0) return null;
                return (
                  <div className="admin-grid-2" style={{ background: "#FEF3C7", border: "1px solid #FBBF24", borderRadius: 12, padding: "14px 20px", marginBottom: 20, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <span style={{ fontSize: 20 }}>⚠️</span>
                      <div>
                        <div style={{ fontWeight: 700, color: "#92400E", fontSize: 14 }}>{pending.length} merchant{pending.length > 1 ? "s" : ""} pending review</div>
                        <div style={{ fontSize: 12, color: "#B45309" }}>Go to Clients tab to review and approve</div>
                      </div>
                    </div>
                    <button onClick={() => setTab("clients")} style={{ background: "#F59E0B", color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 700, fontSize: 12, cursor: "pointer" }}>Review Now</button>
                  </div>
                );
              })()}

              {/* KPI row */}
              <div className="admin-grid-kpi" style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(155px, 1fr))", gap: 14, marginBottom: 20 }}>
                <MetricCard label={t("admin.overview.totalVolume")}    value={fmt(adminStats?.stats?.total_revenue ?? 0)}  sub={`${adminStats?.stats?.total_payments ?? 0} ${t("admin.overview.totalTransactions")}`}  accent={ZP_GREEN}  icon="💰" />
                <MetricCard label={t("admin.overview.feesCollected")}  value={fmt((adminStats?.stats?.total_revenue ?? 0) * 0.029 + (adminStats?.stats?.total_payments ?? 0) * 0.30)}  sub="2.9% + $0.30/tx" accent={ZP_CYAN} icon="🏦" />
                <MetricCard label={t("admin.overview.activeClients")}  value={`${CLIENTS.length}`} sub={`${CLIENTS.filter(c=>c.status==="active").length} live · ${CLIENTS.filter(c=>c.status==="sandbox").length} sandbox`} accent={ZP_PURPLE} icon="🏢" />
                <MetricCard label={t("admin.overview.successRate")}    value={`${adminStats?.stats?.success_rate ?? 0}%`}  sub={`${adminStats?.stats?.succeeded_payments ?? 0} ${t("admin.overview.succeeded")}`}            accent="#D97706"   icon="⏳" />
                <MetricCard label={t("admin.overview.avgTransaction")} value={fmt((adminStats?.stats?.total_revenue ?? 0) / Math.max(adminStats?.stats?.total_payments ?? 1, 1))} sub={t("admin.overview.perTransaction")} accent={ZP_BLUE} icon="📊" />
              </div>

              {/* Revenue chart + Top 5 clients */}
              <div className="admin-chart-2col" style={{ display: "grid", gridTemplateColumns: "2fr 1fr", gap: 16, marginBottom: 16 }}>
                {/* Revenue chart */}
                <div style={{ ...card({ padding: "22px" }) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{t("admin.overview.revenueDaily")}</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{t("admin.overview.processedVolumeByDay")}</div>
                    </div>
                    <div style={{ display: "flex", gap: 6 }}>
                      {[{ label: "7d", val: 7 }, { label: "14d", val: 14 }, { label: "30d", val: 30 }, { label: "90d", val: 90 }].map(r => (
                        <button key={r.val} onClick={() => setOverviewRange(r.val)} style={{ padding: "4px 12px", borderRadius: 8, background: overviewRange === r.val ? ZP_GREEN + "18" : "transparent", border: `1px solid ${overviewRange === r.val ? ZP_GREEN + "44" : BORDER}`, fontSize: 11, fontWeight: 700, color: overviewRange === r.val ? ZP_GREEN : MUTED, cursor: "pointer" }}>{r.label}</button>
                      ))}
                    </div>
                  </div>
                  {(() => {
                    const data = getRevenueByDay(overviewRange);
                    const maxVol = Math.max(...data.map(d => d.vol), 1);
                    const chartHeight = 100;
                    // Show at most 30 bars
                    const shown = data.length > 30 ? data.filter((_, i) => i % Math.ceil(data.length / 30) === 0) : data;
                    return (
                      <>
                        <div style={{ fontSize: 28, fontWeight: 900, color: TEXT, letterSpacing: "-1px", marginBottom: 16 }}>{fmt(data.reduce((a, d) => a + d.vol, 0))}</div>
                        <div style={{ display: "flex", alignItems: "flex-end", gap: Math.max(2, Math.floor(40 / shown.length)), height: chartHeight, marginBottom: 8 }}>
                          {shown.map((d, i) => (
                            <div key={d.date} title={`${d.date}: ${fmt(d.vol)}`} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
                              <div style={{ width: "100%", height: Math.max(4, (d.vol / maxVol) * chartHeight), borderRadius: "4px 4px 0 0", background: d.vol > 0 ? `linear-gradient(180deg, ${ZP_GREEN}80, ${ZP_CYAN}60)` : "rgba(0,0,0,0.06)", transition: "height 0.3s", cursor: "pointer" }} />
                            </div>
                          ))}
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: MUTED }}>
                          <span>{shown[0]?.date.slice(5)}</span>
                          {shown.length > 2 && <span>{shown[Math.floor(shown.length / 2)]?.date.slice(5)}</span>}
                          <span>{shown[shown.length - 1]?.date.slice(5)}</span>
                        </div>
                      </>
                    );
                  })()}
                </div>

                {/* Top 5 clients by volume */}
                <div style={{ ...card({ padding: "22px" }) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{t("admin.overview.topClients")}</div>
                    <button onClick={() => setTab("clients")} style={{ fontSize: 12, color: ZP_GREEN, background: "none", border: "none", cursor: "pointer", fontWeight: 700 }}>All →</button>
                  </div>
                  {top5Clients.length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: MUTED, fontSize: 13 }}>{t("admin.overview.noClientsYet")}</div>
                  ) : top5Clients.map(c => (
                    <div key={c.id} style={{ marginBottom: 14 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
                        <Avatar name={c.name} size={28} grad />
                        <div style={{ flex: 1, fontSize: 13, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{c.name}</div>
                        <div style={{ fontSize: 13, fontWeight: 800, color: ZP_GREEN }}>{fmt(c.volume)}</div>
                      </div>
                      <div style={{ height: 6, borderRadius: 3, background: LIGHT, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.max(2, (c.volume / maxVolume) * 100)}%`, borderRadius: 3, background: ZP_GRAD, transition: "width 0.4s" }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Activity feed + System status */}
              <div className="admin-activity-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
                {/* Recent activity */}
                <div style={{ ...card({ padding: "22px" }) }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16 }}>{t("admin.overview.recentActivity")}</div>
                  {getActivityFeed().length === 0 ? (
                    <div style={{ textAlign: "center", padding: "24px 0", color: MUTED, fontSize: 13 }}>{t("admin.overview.noRecentActivity")}</div>
                  ) : getActivityFeed().map((item, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: i > 0 ? `1px solid ${BORDER}` : "none" }}>
                      <div style={{ width: 8, height: 8, borderRadius: "50%", background: item.color, flexShrink: 0 }} />
                      <div style={{ flex: 1, fontSize: 12, fontWeight: 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        <span style={{ fontSize: 10, fontWeight: 800, color: item.type === "tx" ? ZP_GREEN : ZP_CYAN, marginRight: 6, textTransform: "uppercase" }}>{item.type === "tx" ? "TX" : "SIGNUP"}</span>
                        {item.text}
                      </div>
                      <div style={{ fontSize: 10, color: MUTED, flexShrink: 0, whiteSpace: "nowrap" }}>{fmtDateTime(item.date)}</div>
                    </div>
                  ))}
                </div>

                {/* System status */}
                <div style={{ ...card({ padding: "22px" }) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{t("admin.overview.systemStatus")}</div>
                    <button
                      onClick={async () => {
                        setTestingConnection(true);
                        try {
                          const res = await fetch("/api/zenipay/stats");
                          if (res.ok) showToast(t("admin.overview.connectionOk"), "success");
                          else showToast(t("admin.overview.connectionFailed") + " — " + res.status, "error");
                        } catch { showToast(t("admin.overview.connectionFailed") + " — network error", "error"); }
                        finally { setTestingConnection(false); }
                      }}
                      style={{ padding: "5px 14px", borderRadius: 8, border: `1px solid ${ZP_GREEN}33`, background: ZP_GREEN + "0D", fontSize: 11, fontWeight: 700, color: ZP_GREEN, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                    >
                      {testingConnection ? <Spinner size={12} color={ZP_GREEN} /> : null}
                      {t("admin.overview.testConnection")}
                    </button>
                  </div>
                  {[
                    { name: "ZeniPay API",      status: "active",  note: "Operational",         icon: "🟢" },
                    { name: "Finix Gateway",   status: "active",  note: "Sandbox Active",     icon: "🟢" },
                    { name: "Supabase DB",     status: "active",  note: "Connected",          icon: "🟢" },
                    { name: "Webhooks (Finix)", status: "active", note: "/webhooks/finix",    icon: "🟢" },
                    { name: "Vercel Deploy",   status: "active",  note: "Auto-deploy on push", icon: "🟢" },
                    { name: "Live Migration",  status: "pending", note: "Finix Live pending",  icon: "🟡" },
                  ].map(s => (
                    <div key={s.name} style={{ display: "flex", alignItems: "center", gap: 10, padding: "9px 0", borderTop: `1px solid ${BORDER}` }}>
                      <span style={{ fontSize: 10 }}>{s.icon}</span>
                      <div style={{ flex: 1, fontSize: 13, fontWeight: 600 }}>{s.name}</div>
                      <div style={{ fontSize: 11, color: STATUS_COLOR[s.status] ?? MUTED, fontWeight: 600 }}>{s.note}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ CLIENTS ════════════════ */}
          {tab === "clients" && (
            <div>
              {/* Top bar: search + filter + sort + export */}
              <div className="admin-filter-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
                <div className="admin-filter-row" style={{ display: "flex", alignItems: "center", gap: 10, flex: 1, flexWrap: "wrap" }}>
                  <input
                    type="text"
                    placeholder={t("admin.clients.searchPlaceholder")}
                    value={clientSearch}
                    onChange={e => setClientSearch(e.target.value)}
                    style={{ ...inputStyle, width: 220 }}
                  />
                  <div style={{ display: "flex", gap: 4 }}>
                    {(["all", "active", "sandbox", "suspended"] as const).map(f => (
                      <button key={f} onClick={() => setClientFilter(f)} style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${clientFilter === f ? ZP_CYAN + "66" : BORDER}`, background: clientFilter === f ? ZP_CYAN + "12" : "transparent", fontSize: 12, fontWeight: 700, color: clientFilter === f ? ZP_CYAN : MUTED, cursor: "pointer", textTransform: "capitalize" }}>{f}</button>
                    ))}
                  </div>
                  <select value={clientSort} onChange={e => setClientSort(e.target.value as any)} style={{ ...inputStyle, fontSize: 12 }}>
                    <option value="volume">{t("admin.clients.sortVolume")}</option>
                    <option value="balance">{t("admin.clients.sortBalance")}</option>
                    <option value="recent">{t("admin.clients.sortRecent")}</option>
                    <option value="name">{t("admin.clients.sortName")}</option>
                  </select>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => {
                      const headers = ["ID", "Name", "Email", "Status", "Plan", "Volume", "Balance", "Transactions", "Since"];
                      const rows = CLIENTS.map(c => [c.id, c.name, c.contact, c.status, c.plan, String(c.volume), String(c.balance), String(c.txCount), c.since]);
                      downloadCSV("zenipay-clients.csv", headers, rows);
                      showToast(t("admin.clients.clientsExported"));
                    }}
                    style={{ padding: "9px 18px", borderRadius: 10, border: `1px solid ${BORDER}`, background: SURFACE, fontSize: 12, fontWeight: 700, cursor: "pointer", color: TEXT }}
                  >
                    {t("admin.clients.exportCsv")}
                  </button>
                  <button style={{ padding: "9px 20px", borderRadius: 10, background: ZP_GRAD, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(45,190,96,0.25)" }}>{t("admin.clients.newClient")}</button>
                </div>
              </div>

              {/* Summary row */}
              <div className="admin-client-summary-row" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                {[
                  { label: t("admin.clients.totalClients"), value: `${CLIENTS.length}`,                                              accent: ZP_PURPLE },
                  { label: t("admin.clients.live"),         value: `${CLIENTS.filter(c => c.status === "active" || c.status === "live").length}`,           accent: ZP_GREEN  },
                  { label: t("admin.clients.sandbox"),      value: `${CLIENTS.filter(c => c.status === "sandbox").length}`,          accent: "#D97706" },
                  { label: t("admin.clients.totalVolume"),  value: fmt(CLIENTS.reduce((a, c) => a + c.volume, 0)),                   accent: ZP_CYAN   },
                ].map(s => (
                  <div key={s.label} style={{ ...card({ padding: "14px 16px" }), borderTop: `3px solid ${s.accent}` }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: s.accent }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {getFilteredClients().map(c => (
                <div key={c.id} style={{ ...card({ marginBottom: 14, overflow: "hidden" }) }}>
                  <div style={{ height: 3, background: (c.status === "active" || c.status === "live") ? ZP_GRAD : c.status === "suspended" ? "#DC2626" : "rgba(217,119,6,0.4)" }} />
                  <div style={{ padding: "20px 24px" }}>
                    <div className="admin-client-row" style={{ display: "flex", alignItems: "flex-start", gap: 16, flexWrap: "wrap" }}>
                      <Avatar name={c.name} size={48} grad />
                      <div style={{ flex: 1, minWidth: 200 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 4 }}>
                          <button onClick={() => setClientView(clientView === c.id ? null : c.id)} style={{ fontWeight: 800, fontSize: 16, background: "none", border: "none", cursor: "pointer", color: TEXT, padding: 0, textAlign: "left" }}>{c.name}</button>
                          <div style={{ ...badge(c.status) }}><span style={{ fontSize: 7 }}>●</span> {c.status}</div>
                          <div style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(123,79,191,0.08)", color: ZP_PURPLE, border: `1px solid ${ZP_PURPLE}33` }}>{c.plan}</div>
                          {/* Onboarding state badge */}
                          {(() => {
                            const os = (c as any).onboarding_state;
                            if (os === "provisioning") return <div style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(245,158,11,0.1)", color: "#D97706", border: "1px solid rgba(245,158,11,0.3)" }}>Pending Review</div>;
                            if (os === "approved") return <div style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(22,163,74,0.08)", color: "#16A34A", border: "1px solid rgba(22,163,74,0.3)" }}>Approved</div>;
                            if (os === "rejected") return <div style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(220,38,38,0.08)", color: "#DC2626", border: "1px solid rgba(220,38,38,0.3)" }}>Rejected</div>;
                            return <div style={{ padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: "rgba(148,163,184,0.1)", color: "#94A3B8", border: "1px solid rgba(148,163,184,0.3)" }}>Not Started</div>;
                          })()}
                        </div>
                        <div style={{ fontSize: 12, color: MUTED, marginBottom: 8 }}>{c.domain} · {c.contact} · Since {fmtDate(c.since)}</div>
                        <div style={{ fontSize: 12, color: MUTED, fontStyle: "italic", marginBottom: 12 }}>{c.description}</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {[
                            { k: t("admin.clients.volume"),       v: fmt(c.volume),  accent: ZP_GREEN  },
                            { k: t("admin.clients.balance"),      v: fmt(c.balance), accent: ZP_CYAN   },
                            { k: t("admin.clients.transactions"), v: `${c.txCount}`, accent: ZP_BLUE   },
                            { k: t("admin.clients.gateway"),      v: c.gateway,      accent: ZP_PURPLE },
                          ].map(s => (
                            <div key={s.k} style={{ padding: "5px 12px", borderRadius: 8, background: s.accent + "0D", border: `1px solid ${s.accent}22`, fontSize: 12 }}>
                              <span style={{ color: MUTED }}>{s.k}: </span>
                              <span style={{ fontWeight: 700, color: s.accent }}>{s.v}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      <div className="admin-client-right" style={{ textAlign: "right", flexShrink: 0 }}>
                        <div style={{ fontSize: 24, fontWeight: 900, color: TEXT }}>{fmt(c.volume)}</div>
                        <div style={{ fontSize: 12, color: MUTED }}>{c.txCount} transactions</div>
                        {/* Action buttons */}
                        <div className="admin-client-actions" style={{ display: "flex", gap: 6, marginTop: 10, justifyContent: "flex-end", flexWrap: "wrap" }}>
                          {c.status !== "suspended" && c.status !== "inactive" ? (
                            <button
                              onClick={() => adminAction({ action: "suspend", merchant_id: c.id }, `${c.name} suspended`)}
                              disabled={actionLoading === c.id}
                              style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.06)", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#DC2626", display: "flex", alignItems: "center", gap: 4 }}
                            >
                              {actionLoading === c.id ? <Spinner size={10} color="#DC2626" /> : null} {t("admin.clients.suspend")}
                            </button>
                          ) : (
                            <button
                              onClick={() => adminAction({ action: "activate", merchant_id: c.id }, `${c.name} activated`)}
                              disabled={actionLoading === c.id}
                              style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${ZP_GREEN}44`, background: ZP_GREEN + "0D", fontSize: 11, fontWeight: 700, cursor: "pointer", color: ZP_GREEN, display: "flex", alignItems: "center", gap: 4 }}
                            >
                              {actionLoading === c.id ? <Spinner size={10} color={ZP_GREEN} /> : null} {t("admin.clients.activate")}
                            </button>
                          )}
                          <div style={{ position: "relative" }}>
                            <button
                              onClick={() => setPlanDropdown(planDropdown === c.id ? null : c.id)}
                              style={{ padding: "6px 14px", borderRadius: 8, border: `1px solid ${ZP_PURPLE}33`, background: ZP_PURPLE + "0D", fontSize: 11, fontWeight: 700, cursor: "pointer", color: ZP_PURPLE }}
                            >
                              {t("admin.clients.upgradePlan")}
                            </button>
                            {planDropdown === c.id && (
                              <div style={{ position: "absolute", top: "100%", right: 0, marginTop: 4, background: SURFACE, borderRadius: 10, border: `1px solid ${BORDER}`, boxShadow: "0 8px 24px rgba(0,0,0,0.12)", zIndex: 20, overflow: "hidden", minWidth: 140 }}>
                                {["Standard", "Business", "Complete"].map(plan => (
                                  <button
                                    key={plan}
                                    onClick={() => adminAction({ action: "upgrade_plan", merchant_id: c.id, plan }, `${c.name} upgraded to ${plan}`)}
                                    style={{ display: "block", width: "100%", padding: "10px 16px", border: "none", background: c.plan === plan ? ZP_PURPLE + "12" : "transparent", fontSize: 12, fontWeight: c.plan === plan ? 800 : 600, cursor: "pointer", color: c.plan === plan ? ZP_PURPLE : TEXT, textAlign: "left" }}
                                  >
                                    {plan} {c.plan === plan ? t("admin.clients.current") : ""}
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          {(c as any).onboarding_state === "provisioning" && (
                            <button
                              onClick={() => { setReviewMerchant(c); setShowRejectInput(false); setRejectReason(""); }}
                              style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #FBBF24", background: "#FEF3C7", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#92400E", display: "flex", alignItems: "center", gap: 4 }}
                            >
                              Review Application
                            </button>
                          )}
                          <button onClick={() => setClientView(clientView === c.id ? null : c.id)} style={{ padding: "6px 16px", borderRadius: 8, background: clientView === c.id ? ZP_GRAD : LIGHT, border: `1px solid ${clientView === c.id ? "transparent" : BORDER}`, fontSize: 11, fontWeight: 700, cursor: "pointer", color: clientView === c.id ? "#fff" : TEXT }}>
                            {clientView === c.id ? t("admin.clients.close") : t("admin.clients.details")}
                          </button>
                          <button onClick={async () => { if (!confirm("Delete " + c.name + "? This is PERMANENT and cannot be undone.")) return; if (!confirm("Are you SURE? All data for " + c.name + " will be permanently deleted.")) return; const r = await fetch("/api/zenipay/merchants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete_merchant", merchant_id: c.id }) }); const d = await r.json(); if (d.success) { showToast(c.name + " deleted permanently"); loadMerchants(); } else { showToast("Error: " + (d.error || "Failed")); } }} style={{ padding: "6px 14px", borderRadius: 8, border: "1px solid #FECACA", background: "#FEF2F2", fontSize: 11, fontWeight: 700, cursor: "pointer", color: "#DC2626", display: "flex", alignItems: "center", gap: 4 }}>Delete</button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {clientView === c.id && (
                    <div style={{ borderTop: `1px solid ${BORDER}`, padding: "24px 24px", background: LIGHT }}>
                      <div className="admin-client-detail-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, marginBottom: 16 }}>

                        <div style={{ background: SURFACE, borderRadius: 12, padding: "16px", border: `1px solid ${BORDER}` }}>
                          <div style={{ fontWeight: 700, fontSize: 11, color: ZP_GREEN, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>{t("admin.clients.businessInfo")}</div>
                          {[
                            { k: t("admin.clients.business"),  v: c.name },
                            { k: t("admin.clients.owner"),     v: (c as any).ownerName || "—" },
                            { k: t("admin.clients.email"),     v: c.contact },
                            { k: t("admin.clients.phone"),     v: (c as any).phone || "—" },
                            { k: t("admin.clients.website"),   v: c.domain },
                            { k: t("admin.clients.country"),   v: (c as any).country || "—" },
                            { k: t("admin.clients.type"),      v: c.description },
                            { k: t("admin.clients.estVolume"), v: (c as any).monthlyVolume || "—" },
                          ].map(s => (
                            <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 12 }}>
                              <span style={{ color: MUTED }}>{s.k}</span>
                              <span style={{ fontWeight: 600, maxWidth: 140, textAlign: "right", wordBreak: "break-all" }}>{s.v}</span>
                            </div>
                          ))}
                        </div>

                        <div style={{ background: SURFACE, borderRadius: 12, padding: "16px", border: `1px solid ${BORDER}` }}>
                          <div style={{ fontWeight: 700, fontSize: 11, color: "#10B981", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>{t("admin.clients.cashbackFinix")}</div>
                          {(() => {
                            const vol = c.volume || 0;
                            const txs = c.txCount || 0;
                            const grossFees = vol * 0.029 + txs * 0.30;
                            const cashback90 = grossFees * 0.90;
                            const netFees = grossFees - cashback90;
                            return [{k:t("admin.clients.grossFees"),v:fmt(grossFees),co:"#DC2626"},{k:t("admin.clients.cashbackToZeniPay"),v:fmt(cashback90),co:ZP_GREEN},{k:t("admin.clients.netFeeMerchant"),v:fmt(netFees),co:ZP_PURPLE},{k:t("admin.clients.effectiveRate"),v:`${(vol>0?((netFees/vol)*100):0).toFixed(3)}%`,co:ZP_CYAN}].map(s=>(
                              <div key={s.k} style={{ display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${BORDER}`,fontSize:12 }}>
                                <span style={{ color:MUTED }}>{s.k}</span>
                                <span style={{ fontWeight:700,color:s.co }}>{s.v}</span>
                              </div>
                            ));
                          })()}
                          <div style={{ marginTop:12,padding:10,background:"rgba(16,185,129,0.06)",borderRadius:8,border:"1px solid rgba(16,185,129,0.15)",fontSize:11,color:"#166534",lineHeight:1.6 }}>
                            {t("admin.clients.finixReturns90")}
                          </div>
                        </div>

                        <div style={{ background: SURFACE, borderRadius: 12, padding: "16px", border: `1px solid ${BORDER}` }}>
                          <div style={{ fontWeight: 700, fontSize: 11, color: ZP_CYAN, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 12 }}>{t("admin.clients.apiKeys")}</div>
                          {[
                            { label: "Live Key",    value: c.apiKey,     color: ZP_GREEN  },
                            { label: "Sandbox Key", value: c.sandboxKey, color: "#D97706" },
                          ].map(k => (
                            <div key={k.label} style={{ padding: "10px 12px", borderRadius: 10, background: k.color + "08", border: `1px solid ${k.color}22`, marginBottom: 8 }}>
                              <div style={{ fontSize: 10, fontWeight: 700, color: k.color, letterSpacing: "0.05em", marginBottom: 5 }}>{k.label.toUpperCase()}</div>
                              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                                <code style={{ fontSize: 11, flex: 1, color: TEXT, wordBreak: "break-all" }}>{k.value}</code>
                                <button onClick={() => copyKey(k.value)} style={{ padding: "3px 9px", borderRadius: 6, border: `1px solid ${BORDER}`, background: copiedKey === k.value ? "rgba(22,163,74,0.1)" : SURFACE, color: copiedKey === k.value ? "#16A34A" : MUTED, fontSize: 10, fontWeight: 700, cursor: "pointer", flexShrink: 0 }}>
                                  {copiedKey === k.value ? t("admin.clients.copied") : t("admin.clients.copy")}
                                </button>
                              </div>
                            </div>
                          ))}
                          <div style={{ marginTop: 12 }}>
                            <div style={{ fontWeight: 700, fontSize: 11, color: ZP_PURPLE, textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>{t("admin.clients.account")}</div>
                            {[
                              { k: t("admin.clients.id"),        v: c.id },
                              { k: t("admin.clients.plan"),      v: c.plan },
                              { k: t("admin.clients.since"),     v: fmtDate(c.since) },
                              { k: t("admin.clients.status"),    v: c.status },
                              { k: t("admin.clients.processor"), v: c.gateway },
                            ].map(s => (
                              <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 12 }}>
                                <span style={{ color: MUTED }}>{s.k}</span>
                                <span style={{ fontWeight: 600 }}>{s.v}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {getFilteredClients().length === 0 && (
                <div style={{ ...card({ padding: "40px 20px", textAlign: "center" }) }}>
                  <div style={{ fontSize: 13, color: MUTED }}>{t("admin.clients.noClientsMatch")}</div>
                </div>
              )}

              <div style={{ ...card({ padding: "28px", textAlign: "center", borderStyle: "dashed", borderColor: "rgba(45,190,96,0.25)", background: "rgba(45,190,96,0.02)" }) }}>
                <div style={{ width: 48, height: 48, borderRadius: 14, background: ZP_GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, margin: "0 auto 12px", color: "#fff" }}>+</div>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{t("admin.clients.onboardTitle")}</div>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 16, maxWidth: 360, margin: "0 auto 16px" }}>{t("admin.clients.onboardDesc")}</div>
                <button style={{ padding: "10px 28px", borderRadius: 10, background: ZP_GRAD, border: "none", color: "#fff", fontSize: 14, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 16px rgba(45,190,96,0.25)" }}>{t("admin.clients.newClient")}</button>
              </div>
            </div>
          )}

          {/* ════════════════ TRANSACTIONS ════════════════ */}
          {tab === "transactions" && (
            <div>
              {/* Summary */}
              <div style={{ display: "flex", gap: 14, marginBottom: 16, flexWrap: "wrap" }}>
                <div style={{ ...card({ padding: "14px 20px" }), borderTop: `3px solid ${ZP_GREEN}`, flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: ZP_GREEN }}>{filteredTxs.length}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{t("admin.clients.transactions")}</div>
                </div>
                <div style={{ ...card({ padding: "14px 20px" }), borderTop: `3px solid ${ZP_CYAN}`, flex: 1, minWidth: 140 }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: ZP_CYAN }}>{fmt(txTotalVolume)}</div>
                  <div style={{ fontSize: 11, color: MUTED }}>{t("admin.transactions.totalVolume")}</div>
                </div>
              </div>

              {/* Filters */}
              <div className="admin-filter-row" style={{ ...card({ padding: "14px 18px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" as const }) }}>
                <input
                  type="text"
                  placeholder={t("admin.transactions.searchPlaceholder")}
                  value={txSearch}
                  onChange={e => setTxSearch(e.target.value)}
                  style={{ ...inputStyle, width: 240 }}
                />
                <select value={txStatusFilter} onChange={e => setTxStatusFilter(e.target.value)} style={inputStyle}>
                  <option value="all">{t("admin.transactions.allStatuses")}</option>
                  <option value="succeeded">{t("admin.transactions.succeeded")}</option>
                  <option value="failed">{t("admin.transactions.failed")}</option>
                  <option value="pending">{t("admin.transactions.pending")}</option>
                  <option value="refunded">{t("admin.transactions.refunded")}</option>
                </select>
                <select value={txMerchantFilter} onChange={e => setTxMerchantFilter(e.target.value)} style={inputStyle}>
                  <option value="all">{t("admin.transactions.allMerchants")}</option>
                  {CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
                <div style={{ display: "flex", gap: 4 }}>
                  {[{ label: "7d", val: "7d" }, { label: "30d", val: "30d" }, { label: "90d", val: "90d" }, { label: "All", val: "all" }].map(r => (
                    <button key={r.val} onClick={() => setTxDateRange(r.val)} style={{ padding: "6px 12px", borderRadius: 8, border: `1px solid ${txDateRange === r.val ? ZP_BLUE + "66" : BORDER}`, background: txDateRange === r.val ? ZP_BLUE + "12" : "transparent", fontSize: 11, fontWeight: 700, color: txDateRange === r.val ? ZP_BLUE : MUTED, cursor: "pointer" }}>{r.label}</button>
                  ))}
                </div>
                <div className="admin-ml-auto" style={{ marginLeft: "auto" }}>
                  <button
                    onClick={() => {
                      const headers = ["ID", "Customer", "Email", "Merchant", "Amount", "Status", "Card", "Date", "Description"];
                      const rows = filteredTxs.map((t: any) => [t.id, t.customer || "", t.email || "", t.merchant || t.merchant_id || "", String(t.amount), t.status, `${t.card_brand || ""} ${t.card_last4 || ""}`, t.date || "", t.description || ""]);
                      downloadCSV("zenipay-transactions.csv", headers, rows);
                      showToast(t("admin.transactions.transactionsExported"));
                    }}
                    style={{ padding: "7px 16px", borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE, fontSize: 11, fontWeight: 700, cursor: "pointer", color: TEXT }}
                  >
                    {t("admin.transactions.exportCsv")}
                  </button>
                </div>
              </div>

              {/* Table header */}
              <div className="admin-tx-grid-header" style={{ display: "grid", gridTemplateColumns: "1.2fr 1.5fr 1fr 0.8fr 0.8fr 0.8fr 1fr", gap: 8, padding: "8px 16px", marginBottom: 4 }}>
                {[t("admin.transactions.id"),t("admin.transactions.customer"),t("admin.transactions.merchant"),t("admin.transactions.amount"),t("admin.transactions.card"),t("admin.transactions.status"),t("admin.transactions.date")].map(h => (
                  <div key={h} style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em" }}>{h}</div>
                ))}
              </div>

              {filteredTxs.length === 0 ? (
                <div style={{ ...card({ padding: "60px 20px", textAlign: "center" }) }}>
                  <div style={{ width: 64, height: 64, borderRadius: 18, background: "rgba(45,190,96,0.08)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, margin: "0 auto 16px" }}>↕</div>
                  <div style={{ fontWeight: 800, fontSize: 16, marginBottom: 8 }}>{t("admin.transactions.noTransactionsFound")}</div>
                  <div style={{ fontSize: 13, color: MUTED, maxWidth: 380, margin: "0 auto 24px" }}>{t("admin.transactions.adjustFilters")}</div>
                </div>
              ) : (
                <div style={{ ...card({ overflow: "hidden" }) }}>
                  {filteredTxs.map((t: any, i: number) => (
                    <div key={t.id}>
                      {/* Mobile card view */}
                      <div className="admin-tx-card-mobile" style={{ display: "none" }} onClick={() => setTxExpanded(txExpanded === t.id ? null : t.id)}>
                        <div style={{ padding: "12px 16px", borderTop: i > 0 ? `1px solid ${BORDER}` : "none", cursor: "pointer", background: i % 2 === 0 ? LIGHT : SURFACE }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <div style={{ fontWeight: 700, fontSize: 13 }}>{t.customer || "---"}</div>
                            <div style={{ fontWeight: 800, fontSize: 14, color: t.status === "succeeded" ? ZP_GREEN : t.status === "failed" ? "#DC2626" : "#D97706" }}>{fmt(Number(t.amount))}</div>
                          </div>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                            <div style={{ fontSize: 11, color: MUTED }}>{(t.id || "").slice(0, 12)}...</div>
                            <div style={{ ...badge(t.status === "succeeded" ? "succeeded" : t.status === "failed" ? "failed" : t.status === "refunded" ? "refunded" : "pending") }}><span style={{ fontSize: 7 }}>●</span> {t.status}</div>
                          </div>
                          <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{t.date ? fmtDate(t.date) : "---"} · {t.card_brand || ""} {t.card_last4 ? `••${t.card_last4}` : ""}</div>
                        </div>
                      </div>
                      {/* Desktop grid row */}
                      <div
                        className="admin-tx-grid-row"
                        onClick={() => setTxExpanded(txExpanded === t.id ? null : t.id)}
                        style={{ display: "grid", gridTemplateColumns: "1.2fr 1.5fr 1fr 0.8fr 0.8fr 0.8fr 1fr", gap: 8, padding: "13px 16px", borderTop: i > 0 ? `1px solid ${BORDER}` : "none", alignItems: "center", background: i % 2 === 0 ? LIGHT : SURFACE, cursor: "pointer", transition: "background 0.15s" }}
                      >
                        <div style={{ fontSize: 11, fontFamily: "monospace", color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{(t.id || "").slice(0, 16)}...</div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: 13 }}>{t.customer || "—"}</div>
                          <div style={{ fontSize: 11, color: MUTED, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.email || t.description || ""}</div>
                        </div>
                        <div style={{ fontSize: 12, color: MUTED }}>{(() => { const m = CLIENTS.find(cl => cl.id === (t.merchant_id || t.merchant)); return m ? m.name : t.merchant || "ZeniPay"; })()}</div>
                        <div style={{ fontWeight: 800, fontSize: 14, color: t.status === "succeeded" ? ZP_GREEN : t.status === "failed" ? "#DC2626" : "#D97706" }}>{fmt(Number(t.amount))}</div>
                        <div style={{ fontSize: 11, color: MUTED }}>{t.card_brand || "—"} {t.card_last4 ? `••${t.card_last4}` : ""}</div>
                        <div style={{ ...badge(t.status === "succeeded" ? "succeeded" : t.status === "failed" ? "failed" : t.status === "refunded" ? "refunded" : "pending") }}><span style={{ fontSize: 7 }}>●</span> {t.status}</div>
                        <div style={{ fontSize: 12, color: MUTED }}>{t.date ? fmtDate(t.date) : "—"}</div>
                      </div>

                      {/* Expanded detail */}
                      {txExpanded === t.id && (
                        <div style={{ padding: "16px 24px", background: ZP_BLUE + "06", borderTop: `1px solid ${ZP_BLUE}22` }}>
                          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 14, marginBottom: 12 }}>
                            {[
                              { k: t("admin.transactions.transactionId"), v: t.id },
                              { k: t("admin.transactions.description"), v: t.description || "—" },
                              { k: t("admin.transactions.cardBrand"), v: t.card_brand || "—" },
                              { k: t("admin.transactions.cardLast4"), v: t.card_last4 || "—" },
                              { k: t("admin.transactions.gatewayTransfer"), v: t.transfer_id || t.gateway_id || "—" },
                              { k: t("admin.transactions.paymentLink"), v: t.payment_link_id || "—" },
                              { k: t("admin.transactions.date"), v: t.date || "—" },
                              { k: t("admin.clients.gateway"), v: t.gateway || "ZeniPay" },
                            ].map(s => (
                              <div key={s.k}>
                                <div style={{ fontSize: 10, fontWeight: 700, color: MUTED, textTransform: "uppercase", marginBottom: 4 }}>{s.k}</div>
                                <div style={{ fontSize: 12, fontWeight: 600, wordBreak: "break-all" }}>{s.v}</div>
                              </div>
                            ))}
                          </div>
                          {t.status === "succeeded" && (
                            <button
                              onClick={async () => {
                                if (!confirm("Refund this transaction? This cannot be undone.")) return;
                                setRefundLoading(t.id);
                                try {
                                  const res = await fetch("/api/zenipay/refunds", {
                                    method: "POST",
                                    headers: { "Content-Type": "application/json" },
                                    body: JSON.stringify({ payment_id: t.id, merchant_id: t.merchant_id || t.merchant }),
                                  });
                                  if (res.ok) {
                                    showToast(t("admin.transactions.refundSuccess"));
                                    loadStats();
                                  } else {
                                    const data = await res.json();
                                    showToast(data.error || t("admin.transactions.refundFailed"), "error");
                                  }
                                } catch { showToast(t("admin.transactions.refundNetworkError"), "error"); }
                                finally { setRefundLoading(null); }
                              }}
                              disabled={refundLoading === t.id}
                              style={{ padding: "8px 20px", borderRadius: 8, border: "1px solid rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.06)", fontSize: 12, fontWeight: 700, cursor: "pointer", color: "#DC2626", display: "flex", alignItems: "center", gap: 6 }}
                            >
                              {refundLoading === t.id ? <Spinner size={12} color="#DC2626" /> : null}
                              {t("admin.transactions.refundTransaction")}
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ════════════════ PAYOUTS ════════════════ */}
          {tab === "payouts" && (
            <div>
              {/* Summary cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 14, marginBottom: 20 }}>
                {[
                  { label: t("admin.payouts.totalPaidOut"),    value: fmt(adminStats?.recent_payouts?.reduce((a: number, p: any) => a + Number(p.amount || 0), 0) ?? 0), accent: ZP_GREEN  },
                  { label: t("admin.payouts.pending"),        value: fmt(adminStats?.recent_payouts?.filter((p: any) => p.status === "pending").reduce((a: number, p: any) => a + Number(p.amount || 0), 0) ?? 0), accent: "#D97706" },
                  { label: t("admin.payouts.availableBalance"), value: fmt(CLIENTS.reduce((a, c) => a + c.balance, 0)), accent: ZP_PURPLE },
                  { label: t("admin.payouts.payoutsThisMonth"), value: `${adminStats?.recent_payouts?.length ?? 0}`,    accent: ZP_CYAN   },
                ].map(s => (
                  <div key={s.label} style={{ ...card({ padding: "18px" }), borderTop: `3px solid ${s.accent}` }}>
                    <div style={{ fontSize: 22, fontWeight: 900, color: s.accent }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 4 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Send Payout form */}
              <div style={{ ...card({ padding: "24px", marginBottom: 16 }), borderTop: `3px solid ${ZP_PURPLE}` }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, color: ZP_PURPLE }}>{t("admin.payouts.sendPayout")}</div>
                <div className="admin-payout-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>{t("admin.payouts.merchant")}</label>
                    <select value={payoutForm.merchant_id} onChange={e => setPayoutForm(f => ({ ...f, merchant_id: e.target.value }))} style={{ ...inputStyle, width: "100%" }}>
                      <option value="">{t("admin.payouts.selectMerchant")}</option>
                      {CLIENTS.map(c => <option key={c.id} value={c.id}>{c.name} ({fmt(c.balance)} avail)</option>)}
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>{t("admin.payouts.amount")}</label>
                    <input type="number" min="0" step="0.01" placeholder="0.00" value={payoutForm.amount} onChange={e => setPayoutForm(f => ({ ...f, amount: e.target.value }))} style={{ ...inputStyle, width: "100%" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>{t("admin.payouts.method")}</label>
                    <div style={{ display: "flex", gap: 8, marginTop: 4 }}>
                      {([["ach" as const, t("admin.payouts.achFree")], ["wire" as const, t("admin.payouts.wire25")]]).map(([val, label]) => (
                        <label key={val} style={{ display: "flex", alignItems: "center", gap: 6, cursor: "pointer", fontSize: 13 }}>
                          <input type="radio" name="payout_method" checked={payoutForm.method === val} onChange={() => setPayoutForm(f => ({ ...f, method: val as "ach" | "wire" }))} />
                          {label}
                        </label>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>{t("admin.payouts.note")}</label>
                    <input type="text" placeholder={t("admin.payouts.optionalNote")} value={payoutForm.note} onChange={e => setPayoutForm(f => ({ ...f, note: e.target.value }))} style={{ ...inputStyle, width: "100%" }} />
                  </div>
                </div>
                <button
                  disabled={payoutLoading || !payoutForm.merchant_id || !payoutForm.amount || Number(payoutForm.amount) <= 0}
                  onClick={async () => {
                    setPayoutLoading(true);
                    try {
                      const res = await fetch("/api/zenipay/admin/actions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "send_payout",
                          merchant_id: payoutForm.merchant_id,
                          amount: Number(payoutForm.amount),
                          method: payoutForm.method,
                          note: payoutForm.note,
                        }),
                      });
                      if (res.ok) {
                        showToast(`${fmt(Number(payoutForm.amount))} ${t("admin.payouts.payoutSent")}`);
                        setPayoutForm({ merchant_id: "", amount: "", method: "ach", note: "" });
                        loadMerchants();
                        loadStats();
                      } else {
                        const data = await res.json();
                        showToast(data.error || t("admin.payouts.payoutFailed"), "error");
                      }
                    } catch { showToast(t("admin.payouts.payoutNetworkError"), "error"); }
                    finally { setPayoutLoading(false); }
                  }}
                  style={{
                    padding: "10px 28px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
                    background: (!payoutForm.merchant_id || !payoutForm.amount) ? "#CBD5E1" : ZP_GRAD,
                    color: "#fff", boxShadow: "0 4px 12px rgba(45,190,96,0.18)", opacity: payoutLoading ? 0.6 : 1,
                    display: "flex", alignItems: "center", gap: 8,
                  }}
                >
                  {payoutLoading ? <Spinner size={14} /> : null}
                  {t("admin.payouts.sendPayout")}
                </button>
              </div>

              {/* Payout history */}
              <div style={{ ...card({ overflow: "hidden", marginBottom: 16 }) }}>
                <div style={{ padding: "14px 18px", fontWeight: 800, fontSize: 15, borderBottom: `1px solid ${BORDER}` }}>{t("admin.payouts.payoutHistory")}</div>
                <div className="admin-table-wrap">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: LIGHT, borderBottom: `1px solid ${BORDER}` }}>
                      {["ID", "Merchant", "Amount", "Method", "Status", "Date"].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(!adminStats?.recent_payouts || adminStats.recent_payouts.length === 0) ? (
                      <tr><td colSpan={6} style={{ padding: 32, textAlign: "center", color: MUTED }}>{t("admin.payouts.noPayoutsYet")}</td></tr>
                    ) : adminStats.recent_payouts.map((p: any, i: number) => (
                      <tr key={p.id || i} style={{ borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? LIGHT : SURFACE }}>
                        <td style={{ padding: "10px 14px", fontFamily: "monospace", fontSize: 11 }}>{(p.id || "").slice(0, 16)}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 600 }}>{(() => { const m = CLIENTS.find(c => c.id === p.merchant_id); return m ? m.name : p.merchant_id || "—"; })()}</td>
                        <td style={{ padding: "10px 14px", fontWeight: 800, color: ZP_GREEN }}>{fmt(Number(p.amount || 0))}</td>
                        <td style={{ padding: "10px 14px", textTransform: "uppercase", fontSize: 11, fontWeight: 700 }}>{p.method || "ACH"}</td>
                        <td style={{ padding: "10px 14px" }}><span style={{ ...badge(p.status === "completed" ? "active" : p.status === "failed" ? "failed" : "pending") }}><span style={{ fontSize: 7 }}>●</span> {p.status || "pending"}</span></td>
                        <td style={{ padding: "10px 14px", color: MUTED }}>{p.date ? fmtDate(p.date) : p.created_at ? fmtDate(p.created_at) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              </div>

              {/* Per-merchant balances */}
              <div style={{ ...card({ padding: "22px" }) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div style={{ fontWeight: 800, fontSize: 15 }}>{t("admin.payouts.clientBalances")}</div>
                  <div style={{ fontSize: 12, color: MUTED }}>{t("admin.payouts.realTime")}</div>
                </div>

                {/* Platform account */}
                <div style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 12px", background: ZP_CYAN + "06", borderRadius: 10, marginBottom: 8 }}>
                  <div style={{ width: 40, height: 40, borderRadius: 12, background: ZP_GRAD, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: "#fff", flexShrink: 0 }}>Z</div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 800, fontSize: 14 }}>ZeniPay Platform <span style={{ fontSize: 10, fontWeight: 700, color: ZP_CYAN, background: ZP_CYAN + "15", border: `1px solid ${ZP_CYAN}33`, borderRadius: 6, padding: "1px 7px", marginLeft: 4 }}>{t("admin.payouts.platform")}</span></div>
                    <div style={{ fontSize: 11, color: MUTED }}>{t("admin.payouts.autoCommission")} · {PLATFORM_ACCOUNT.account}</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: ZP_CYAN }}>{fmt(adminStats?.wallets?.platform?.available ?? PLATFORM_ACCOUNT.balance)}</div>
                    <div style={{ fontSize: 11, color: MUTED }}>{t("admin.payouts.feesCollected")}</div>
                  </div>
                </div>

                {CLIENTS.map(c => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 0", borderTop: `1px solid ${BORDER}` }}>
                    <Avatar name={c.name} size={40} grad />
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>ZeniCard · {c.bankAccount}</div>
                    </div>
                    <div style={{ textAlign: "right", marginRight: 12 }}>
                      <div style={{ fontSize: 20, fontWeight: 900, color: ZP_GREEN }}>{fmt(c.balance)}</div>
                      <div style={{ fontSize: 11, color: MUTED }}>{t("admin.payouts.available")}</div>
                    </div>
                    <button
                      onClick={() => { setPayoutForm(f => ({ ...f, merchant_id: c.id })); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                      style={{ padding: "7px 16px", borderRadius: 8, background: ZP_GRAD, border: "none", color: "#fff", fontSize: 12, fontWeight: 700, cursor: "pointer", boxShadow: "0 3px 8px rgba(45,190,96,0.2)" }}
                    >
                      {t("admin.payouts.payoutBtn")}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ════════════════ ZENICARD / BANKING ════════════════ */}
          {tab === "bank" && (
            <div>
              <div className="admin-bank-2col" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>

                <div style={{ ...card({ padding: "24px" }) }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                    <div>
                      <div style={{ fontWeight: 800, fontSize: 15 }}>{t("admin.bank.zenicardUnit")}</div>
                      <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{t("admin.bank.businessBankAccount")}</div>
                    </div>
                    <div style={{ ...badge("active") }}><span style={{ fontSize: 7 }}>●</span> Active</div>
                  </div>
                  {[
                    { k: "Provider",          v: "Unit.co",               color: ZP_CYAN   },
                    { k: "Customer ID",       v: BANK_STATUS.customerId,  color: TEXT      },
                    { k: "Routing Number",    v: BANK_STATUS.routing,     color: TEXT      },
                    { k: "Account Number",    v: BANK_STATUS.account,     color: TEXT      },
                    { k: "Available Balance", v: fmt(adminStats?.wallets?.platform?.available ?? BANK_STATUS.balance), color: ZP_GREEN },
                    { k: "Account Type",      v: "Business Chequing",     color: ZP_PURPLE },
                    { k: "Debit Card",        v: "Virtual Visa",          color: ZP_BLUE   },
                  ].map(s => (
                    <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                      <span style={{ color: MUTED }}>{s.k}</span>
                      <span style={{ fontWeight: 700, color: s.color }}>{s.v}</span>
                    </div>
                  ))}
                  <button style={{ marginTop: 16, width: "100%", padding: "10px", borderRadius: 10, background: ZP_GRAD, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(45,190,96,0.2)" }}>{t("admin.bank.openUnit")}</button>
                </div>

                <div style={{ ...card({ padding: "24px" }) }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>{t("admin.bank.zenicardDebit")}</div>
                  <div style={{ borderRadius: 18, padding: "22px 24px", marginBottom: 20, background: ZP_GRAD, position: "relative", overflow: "hidden", boxShadow: "0 12px 40px rgba(45,190,96,0.25)", minHeight: 140 }}>
                    <div style={{ position: "absolute", top: -30, right: -30, width: 140, height: 140, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
                    <div style={{ position: "absolute", bottom: -40, left: -10, width: 180, height: 180, borderRadius: "50%", background: "rgba(255,255,255,0.04)" }} />
                    <div style={{ fontSize: 10, color: "rgba(255,255,255,0.65)", letterSpacing: "0.15em", marginBottom: 24, fontWeight: 700 }}>ZENIPAY · ZENICARD</div>
                    <div style={{ fontSize: 16, letterSpacing: "0.18em", color: "#fff", fontWeight: 700, marginBottom: 20 }}>•••• •••• •••• 5847</div>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                      <div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", marginBottom: 2 }}>CARDHOLDER</div>
                        <div style={{ fontSize: 12, color: "#fff", fontWeight: 800 }}>ZENIVA TRAVEL LLC</div>
                      </div>
                      <div style={{ textAlign: "right" }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.55)", marginBottom: 2 }}>EXPIRES</div>
                        <div style={{ fontSize: 12, color: "#fff", fontWeight: 700 }}>12/28</div>
                      </div>
                    </div>
                  </div>
                  {[
                    { k: "Card Type",    v: "Virtual Visa Debit",   color: ZP_CYAN   },
                    { k: "Card ID",      v: "5487715",              color: TEXT      },
                    { k: "Status",       v: "Active",               color: ZP_GREEN  },
                    { k: "Linked to",    v: "Unit.co ••••5847",     color: TEXT      },
                  ].map(s => (
                    <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                      <span style={{ color: MUTED }}>{s.k}</span>
                      <span style={{ fontWeight: 700, color: s.color }}>{s.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...card({ padding: "24px", marginBottom: 16 }), borderTop: `3px solid ${ZP_CYAN}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{t("admin.bank.platformRevenueAccount")}</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{t("admin.bank.commissionsDeposited")}</div>
                  </div>
                  <div style={{ ...badge("active") }}><span style={{ fontSize: 7 }}>●</span> Active</div>
                </div>

                <div className="admin-platform-rev-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 20 }}>
                  <div>
                    {[
                      { k: "Account Name",  v: PLATFORM_ACCOUNT.name,       color: TEXT      },
                      { k: "Account Type",  v: PLATFORM_ACCOUNT.type,        color: ZP_PURPLE },
                      { k: "Routing",       v: PLATFORM_ACCOUNT.routing,     color: TEXT      },
                      { k: "Account No.",   v: PLATFORM_ACCOUNT.account,     color: TEXT      },
                      { k: "Balance",       v: fmt(PLATFORM_ACCOUNT.balance), color: ZP_GREEN },
                      { k: "Customer ID",   v: PLATFORM_ACCOUNT.customerId,  color: MUTED     },
                    ].map(s => (
                      <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "9px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                        <span style={{ color: MUTED }}>{s.k}</span>
                        <span style={{ fontWeight: 700, color: s.color }}>{s.v}</span>
                      </div>
                    ))}
                  </div>

                  <div>
                    <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 12 }}>{t("admin.bank.feeBreakdown")}</div>
                    {[
                      { label: "Client pays",                sub: "$100.00 (2.90% + $0.30 = $3.20 fee)",  color: ZP_GREEN,  icon: "💳" },
                      { label: "Interchange cost",           sub: "1.75% = $1.75",                          color: "#D97706", icon: "🏧" },
                      { label: "Finix fee",                  sub: "0.15% + $0.15 = $0.30",                  color: "#D97706", icon: "⚙️" },
                      { label: "Total Finix cost",           sub: "1.90% + $0.15 = $2.05",                  color: "#EF4444", icon: "📊" },
                      { label: "ZeniPay markup",             sub: "1.00% + $0.15 = $1.15",                  color: ZP_CYAN,   icon: "🏦" },
                      { label: "Finix pays back 90%",        sub: "90% x $1.15 = $1.035 → ZeniPay",        color: ZP_PURPLE, icon: "⚡" },
                    ].map((s, i) => (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < 3 ? `1px solid ${BORDER}` : "none" }}>
                        <div style={{ width: 28, height: 28, borderRadius: 8, background: s.color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13 }}>{s.icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, fontSize: 13, color: TEXT }}>{s.label}</div>
                          <div style={{ fontSize: 11, color: MUTED }}>{s.sub}</div>
                        </div>
                        {i < 5 && <div style={{ fontSize: 14, color: MUTED }}>↓</div>}
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>{t("admin.bank.commissionRulesByPlan")}</div>
                <div className="admin-grid-commission" style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                  {COMMISSION_RULES.map(r => (
                    <div key={r.plan} style={{ padding: "12px 14px", borderRadius: 12, background: r.color + "08", border: `1px solid ${r.color}22` }}>
                      <div style={{ fontWeight: 800, fontSize: 13, color: r.color, marginBottom: 8 }}>{r.plan}</div>
                      {[
                        { k: t("admin.bank.chargedToMerchant"), v: r.charged },
                        { k: t("admin.bank.finixTotalCost"),    v: r.finixCost },
                        { k: t("admin.bank.zenipayMarkup"),     v: r.zeniMargin },
                        { k: t("admin.bank.finixPaysBack90"),   v: r.finixPaysBack, bold: true },
                      ].map(s => (
                        <div key={s.k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, padding: "4px 0", borderBottom: `1px solid ${r.color}18` }}>
                          <span style={{ color: MUTED }}>{s.k}</span>
                          <span style={{ fontWeight: (s as any).bold ? 800 : 600, color: (s as any).bold ? r.color : TEXT }}>{s.v}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ ...card({ padding: "24px" }) }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 15 }}>{t("admin.bank.paymentProcessor")}</div>
                    <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{t("admin.bank.incomingGateway")}</div>
                  </div>
                  <div style={{ ...badge("sandbox") }}><span style={{ fontSize: 7 }}>◎</span> Sandbox</div>
                </div>
                <div style={{ padding: "10px 16px", borderRadius: 10, background: "rgba(217,119,6,0.05)", border: "1px solid rgba(217,119,6,0.2)", marginBottom: 16, fontSize: 13, color: "#92400E", display: "flex", alignItems: "center", gap: 8 }}>
                  <span>⚠️</span> {t("admin.bank.finixSandboxWarning")}
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12, marginBottom: 16 }}>
                  {[
                    { k: "Account ID",       v: GATEWAY_STATUS.accountId,     color: ZP_CYAN   },
                    { k: "Environment",      v: "Sandbox",                    color: "#D97706" },
                    { k: "Merchant Fee",     v: "2.90% + $0.30/tx",           color: ZP_GREEN  },
                    { k: "Interchange",      v: "1.75%",                      color: "#D97706" },
                    { k: "Finix Fee",        v: "0.15% + $0.15/tx",           color: "#EF4444" },
                    { k: "Total Cost",       v: "1.90% + $0.15/tx",           color: "#EF4444" },
                    { k: "Finix Pays Back",  v: "90% of markup",              color: ZP_PURPLE },
                    { k: "Webhook URL",      v: GATEWAY_STATUS.webhook,       color: TEXT      },
                  ].map(s => (
                    <div key={s.k} style={{ padding: "12px 14px", borderRadius: 10, background: LIGHT, border: `1px solid ${BORDER}` }}>
                      <div style={{ fontSize: 10, color: MUTED, fontWeight: 700, letterSpacing: "0.05em", marginBottom: 5 }}>{s.k.toUpperCase()}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: s.color, wordBreak: "break-all" }}>{s.v}</div>
                    </div>
                  ))}
                </div>
                <a href="https://dashboard.finix.com" target="_blank" rel="noreferrer" style={{ display: "inline-block", padding: "10px 24px", borderRadius: 10, background: ZP_GRAD, color: "#fff", fontSize: 13, fontWeight: 700, textDecoration: "none", boxShadow: "0 4px 12px rgba(45,190,96,0.25)" }}>
                  {t("admin.bank.completeLiveOnboarding")}
                </a>
              </div>
            </div>
          )}

          {/* ════════════════ API & KEYS ════════════════ */}
          {tab === "api" && (
            <div>
              <div style={{ ...card({ padding: "24px", marginBottom: 16 }) }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 20 }}>{t("admin.api.clientApiKeys")}</div>
                {CLIENTS.map(c => (
                  <div key={c.id} style={{ padding: "16px 0", borderTop: `1px solid ${BORDER}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <Avatar name={c.name} size={32} grad />
                        <div style={{ fontWeight: 700, fontSize: 14 }}>{c.name}</div>
                      </div>
                      <div style={{ ...badge(c.status) }}><span style={{ fontSize: 7 }}>●</span> {c.status}</div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                      {[
                        { label: "Live Key",    value: c.apiKey,     color: ZP_GREEN  },
                        { label: "Sandbox Key", value: c.sandboxKey, color: "#D97706" },
                      ].map(k => (
                        <div key={k.label} style={{ padding: "10px 14px", borderRadius: 10, background: k.color + "08", border: `1px solid ${k.color}22`, display: "flex", alignItems: "center", gap: 10 }}>
                          <span style={{ fontSize: 10, fontWeight: 800, color: k.color, letterSpacing: "0.05em", minWidth: 80 }}>{k.label}</span>
                          <code style={{ flex: 1, fontSize: 13, color: TEXT }}>{k.value}</code>
                          <button onClick={() => copyKey(k.value)} style={{ padding: "4px 12px", borderRadius: 6, background: copiedKey === k.value ? "rgba(22,163,74,0.1)" : SURFACE, border: `1px solid ${BORDER}`, color: copiedKey === k.value ? "#16A34A" : MUTED, fontSize: 11, fontWeight: 700, cursor: "pointer" }}>
                            {copiedKey === k.value ? t("admin.clients.copiedFull") : t("admin.clients.copy")}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ ...card({ padding: "24px" }) }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 6 }}>{t("admin.api.zenipayRestApi")}</div>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 20 }}>
                  Base URL: <code style={{ background: ZP_PURPLE + "12", color: ZP_PURPLE, padding: "2px 8px", borderRadius: 6, fontWeight: 700 }}>https://zenipay.ca/api/v1</code>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                  {[
                    { m: "POST",   p: "/payments",     d: "Create a payment intent",         tag: "Payments",     tc: ZP_GREEN  },
                    { m: "GET",    p: "/payments/:id", d: "Retrieve a payment",              tag: "Payments",     tc: ZP_CYAN   },
                    { m: "GET",    p: "/transactions", d: "List all transactions",           tag: "Transactions", tc: ZP_CYAN   },
                    { m: "GET",    p: "/balance",      d: "Get ZeniCard balance",            tag: "ZeniCard",     tc: ZP_BLUE   },
                    { m: "POST",   p: "/payouts",      d: "Trigger a payout",               tag: "Payouts",      tc: ZP_GREEN  },
                    { m: "POST",   p: "/pay-links",    d: "Create a payment link",          tag: "Links",        tc: ZP_GREEN  },
                    { m: "GET",    p: "/pay-links",    d: "List payment links",             tag: "Links",        tc: ZP_CYAN   },
                    { m: "GET",    p: "/clients",      d: "List platform clients (admin)",  tag: "Admin",        tc: ZP_PURPLE },
                    { m: "POST",   p: "/provision",    d: "Provision a ZeniCard account",   tag: "ZeniCard",     tc: ZP_GREEN  },
                    { m: "GET",    p: "/accounting",   d: "Accounting & ledger summary",    tag: "Accounting",   tc: ZP_CYAN   },
                    { m: "DELETE", p: "/pay-links/:id", d: "Expire a payment link",         tag: "Links",        tc: "#DC2626"  },
                  ].map((e, i) => {
                    const mc = e.m === "POST" ? { bg: "rgba(22,163,74,0.1)", txt: ZP_GREEN } : e.m === "GET" ? { bg: "rgba(42,143,224,0.1)", txt: ZP_BLUE } : { bg: "rgba(220,38,38,0.1)", txt: "#DC2626" };
                    return (
                      <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 12px", borderRadius: 10, background: i % 2 === 0 ? LIGHT : SURFACE, border: `1px solid ${BORDER}` }}>
                        <div style={{ padding: "3px 9px", borderRadius: 6, fontSize: 10, fontWeight: 800, minWidth: 52, textAlign: "center", background: mc.bg, color: mc.txt }}>{e.m}</div>
                        <code style={{ fontSize: 13, flex: 1, color: TEXT }}>/api/v1{e.p}</code>
                        <span style={{ fontSize: 12, color: MUTED }}>{e.d}</span>
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 6, background: e.tc + "12", color: e.tc, border: `1px solid ${e.tc}22` }}>{e.tag}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}


          {/* cashback tab */}
          {tab === "cashback" && (() => {
            const s = (cashbackData as Record<string,unknown>)?.summary as Record<string,unknown> | undefined;
            const txF = ((cashbackData as Record<string,unknown>)?.transaction_fees || []) as Array<Record<string,unknown>>;
            const setts = ((cashbackData as Record<string,unknown>)?.settlements || []) as Array<Record<string,unknown>>;
            return (<div>
              <div style={{ marginBottom: 20 }}><div style={{ fontWeight: 800, fontSize: 16 }}>{t("admin.cashback.title")}</div><div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{t("admin.cashback.subtitle")}</div></div>
              <div className="admin-cashback-summary" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 20 }}>
                {[{l:t("admin.cashback.totalVolume"),v:s?fmt(Number(s.total_volume||0)):"...",a:ZP_GREEN},{l:t("admin.cashback.feesCollected"),v:s?fmt(Number(s.total_platform_fees||0)):"...",a:ZP_CYAN},{l:t("admin.cashback.cashback90"),v:s?fmt(Number(s.total_cashback_payouts||0)):"...",a:ZP_PURPLE},{l:t("admin.clients.transactions"),v:s?String(s.transactions_count):"...",a:"#E5247B"}].map(c=>(<div key={c.l} style={{ ...card({ padding: "14px 16px" }), borderTop: `3px solid ${c.a}` }}><div style={{ fontSize: 20, fontWeight: 900, color: c.a }}>{c.v}</div><div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{c.l}</div></div>))}
              </div>
              <div style={{ ...card({ overflow: "hidden" }), marginBottom: 20 }}>
                <div style={{ padding: "14px 16px", fontWeight: 700, borderBottom: `1px solid ${BORDER}` }}>{t("admin.cashback.perTxCashback")}</div>
                <div className="admin-table-wrap">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr style={{ background: LIGHT, borderBottom: `1px solid ${BORDER}` }}>{["Transfer","Amount","Gross Fee","Cashback 90%","Net Fee"].map(h=><th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
                  <tbody>{txF.length===0?<tr><td colSpan={5} style={{ padding:32,textAlign:"center",color:MUTED }}>Loading...</td></tr>:txF.map((t:Record<string,unknown>)=>(<tr key={String(t.transfer_id)} style={{ borderBottom:`1px solid ${BORDER}` }}><td style={{ padding:"10px 14px",fontFamily:"monospace",fontSize:11 }}>{String(t.transfer_id).slice(0,18)}</td><td style={{ padding:"10px 14px",fontWeight:700 }}>{fmt(Number(t.amount))}</td><td style={{ padding:"10px 14px",color:"#DC2626" }}>-{fmt(Number(t.gross_fee))}</td><td style={{ padding:"10px 14px",color:ZP_GREEN,fontWeight:700 }}>+{fmt(Number(t.cashback_90pct))}</td><td style={{ padding:"10px 14px",fontWeight:800 }}>{fmt(Number(t.net_fee_merchant))}</td></tr>))}</tbody>
                </table>
                </div>
              </div>
              <div style={{ ...card({ overflow: "hidden" }) }}>
                <div style={{ padding: "14px 16px", fontWeight: 700, borderBottom: `1px solid ${BORDER}` }}>Settlement History</div>
                <div className="admin-table-wrap">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead><tr style={{ background: LIGHT, borderBottom: `1px solid ${BORDER}` }}>{["Period","Volume","Fees","Cashback","Net","Status"].map(h=><th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase" }}>{h}</th>)}</tr></thead>
                  <tbody>{setts.length===0?<tr><td colSpan={6} style={{ padding:32,textAlign:"center",color:MUTED }}>Loading...</td></tr>:setts.map((st:Record<string,unknown>)=>(<tr key={String(st.id)} style={{ borderBottom:`1px solid ${BORDER}` }}><td style={{ padding:"10px 14px",fontSize:11,color:MUTED }}>{String(st.period_start||"").slice(0,10)} &rarr; {String(st.period_end||"").slice(0,10)}</td><td style={{ padding:"10px 14px",fontWeight:700 }}>{fmt(Number(st.total_amount))}</td><td style={{ padding:"10px 14px",color:"#DC2626" }}>-{fmt(Number(st.total_fees))}</td><td style={{ padding:"10px 14px",color:ZP_GREEN,fontWeight:700 }}>+{fmt(Number(st.cashback_to_platform))}</td><td style={{ padding:"10px 14px",fontWeight:800 }}>{fmt(Number(st.net_amount))}</td><td style={{ padding:"10px 14px" }}><span style={{ padding:"3px 10px",borderRadius:20,fontSize:11,fontWeight:700,background:String(st.status)==="APPROVED"?"rgba(22,163,74,0.08)":"rgba(217,119,6,0.08)",color:String(st.status)==="APPROVED"?"#16A34A":"#D97706" }}>{String(st.status)}</span></td></tr>))}</tbody>
                </table>
                </div>
              </div>
            </div>);
          })()}

          {/* ════════════════ BILLING ════════════════ */}
          {tab === "billing" && (
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 16 }}>{t("admin.billing.title")}</div>
                  <div style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>{t("admin.billing.subtitle")}</div>
                </div>
                <button
                  onClick={() => setBillingForm(f => ({ ...f, open: !f.open }))}
                  style={{ padding: "9px 20px", borderRadius: 10, background: "linear-gradient(135deg, #E5247B 0%, #7B4FBF 100%)", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(229,36,123,0.25)" }}
                >
                  {billingForm.open ? t("admin.billing.cancel") : t("admin.billing.generateMonthlyInvoice")}
                </button>
              </div>

              {/* Generate Invoice Form */}
              {billingForm.open && (
                <div style={{ ...card({ padding: "24px", marginBottom: 20 }), borderTop: "3px solid #E5247B" }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 16, color: "#E5247B" }}>{t("admin.billing.generateNewInvoice")}</div>
                  <div className="admin-billing-form-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 14, marginBottom: 16 }}>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t("admin.payouts.merchant")}</label>
                      <select
                        value={billingForm.merchant_id}
                        onChange={e => {
                          const sel = CLIENTS.find(c => c.id === e.target.value);
                          setBillingForm(f => ({ ...f, merchant_id: e.target.value, merchant_name: sel?.name ?? "" }));
                        }}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13, background: SURFACE, color: TEXT, outline: "none" }}
                      >
                        <option value="">Select a merchant...</option>
                        {CLIENTS.map(c => (
                          <option key={c.id} value={c.id}>{c.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t("admin.billing.periodStart")}</label>
                      <input
                        type="date"
                        value={billingForm.period_start}
                        onChange={e => setBillingForm(f => ({ ...f, period_start: e.target.value }))}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13, background: SURFACE, color: TEXT, outline: "none" }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.04em" }}>{t("admin.billing.periodEnd")}</label>
                      <input
                        type="date"
                        value={billingForm.period_end}
                        onChange={e => setBillingForm(f => ({ ...f, period_end: e.target.value }))}
                        style={{ width: "100%", padding: "10px 12px", borderRadius: 10, border: `1px solid ${BORDER}`, fontSize: 13, background: SURFACE, color: TEXT, outline: "none" }}
                      />
                    </div>
                  </div>
                  <button
                    disabled={billingLoading || !billingForm.merchant_id || !billingForm.period_start || !billingForm.period_end}
                    onClick={async () => {
                      setBillingLoading(true);
                      try {
                        const res = await fetch("/api/zenipay/admin/billing", {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            merchant_id: billingForm.merchant_id,
                            merchant_name: billingForm.merchant_name,
                            period_start: billingForm.period_start,
                            period_end: billingForm.period_end,
                          }),
                        });
                        const data = await res.json();
                        if (data.invoice) {
                          setBillingInvoices(prev => [data.invoice, ...prev]);
                          setBillingForm({ open: false, merchant_id: "", merchant_name: "", period_start: "", period_end: "" });
                          showToast(t("admin.billing.invoiceGenerated"));
                        } else {
                          showToast(data.error || t("admin.billing.invoiceFailed"), "error");
                        }
                      } catch {
                        showToast(t("admin.billing.invoiceFailed"), "error");
                      } finally {
                        setBillingLoading(false);
                      }
                    }}
                    style={{
                      padding: "10px 28px", borderRadius: 10, border: "none", fontSize: 13, fontWeight: 700, cursor: "pointer",
                      background: (!billingForm.merchant_id || !billingForm.period_start || !billingForm.period_end) ? "#CBD5E1" : "linear-gradient(135deg, #E5247B 0%, #7B4FBF 100%)",
                      color: "#fff", boxShadow: "0 4px 12px rgba(229,36,123,0.18)", opacity: billingLoading ? 0.6 : 1,
                    }}
                  >
                    {billingLoading ? t("admin.billing.generating") : t("admin.billing.generateInvoice")}
                  </button>
                </div>
              )}

              {/* Search/filter for billing */}
              <div className="admin-filter-row" style={{ ...card({ padding: "12px 18px", marginBottom: 16, display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" as const }) }}>
                <input
                  type="text"
                  placeholder={t("admin.billing.searchPlaceholder")}
                  value={billingSearch}
                  onChange={e => setBillingSearch(e.target.value)}
                  style={{ ...inputStyle, width: 220 }}
                />
                <select value={billingStatusFilter} onChange={e => setBillingStatusFilter(e.target.value)} style={inputStyle}>
                  <option value="all">{t("admin.billing.allStatuses")}</option>
                  <option value="pending">{t("admin.payouts.pending")}</option>
                  <option value="paid">{t("admin.billing.paid")}</option>
                  <option value="overdue">{t("admin.billing.overdue")}</option>
                </select>
                <div style={{ marginLeft: "auto", fontSize: 12, color: MUTED }}>{getFilteredInvoices().length} invoice(s)</div>
              </div>

              {/* Summary cards */}
              <div className="admin-grid-5" style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: 12, marginBottom: 20 }}>
                {[
                  { label: t("admin.billing.totalInvoices"), value: `${billingInvoices.length}`, accent: "#E5247B" },
                  { label: t("admin.payouts.pending"), value: `${billingInvoices.filter(i => i.status === "pending").length}`, accent: "#D97706" },
                  { label: t("admin.billing.paid"), value: `${billingInvoices.filter(i => i.status === "paid").length}`, accent: ZP_GREEN },
                  { label: t("admin.billing.overdue"), value: `${billingInvoices.filter(i => i.status === "overdue").length}`, accent: "#DC2626" },
                  { label: t("admin.billing.totalBilled"), value: fmt(billingInvoices.reduce((a: number, i: any) => a + Number(i.total_fees ?? 0), 0)), accent: ZP_PURPLE },
                ].map(s => (
                  <div key={s.label} style={{ ...card({ padding: "14px 16px" }), borderTop: `3px solid ${s.accent}` }}>
                    <div style={{ fontSize: 20, fontWeight: 900, color: s.accent }}>{s.value}</div>
                    <div style={{ fontSize: 11, color: MUTED, marginTop: 3 }}>{s.label}</div>
                  </div>
                ))}
              </div>

              {/* Billing table */}
              <div style={{ ...card({ overflow: "hidden" }) }}>
                <div className="admin-table-wrap" style={{ overflowX: "auto" }}>
                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: LIGHT, borderBottom: `1px solid ${BORDER}` }}>
                        {["Invoice #", "Merchant", "Period", "Volume", "Tx Count", "Fees (2.9% + $0.30)", "Platform Fee", "Total", "Status", "Actions"].map(h => (
                          <th key={h} style={{ padding: "12px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.04em", whiteSpace: "nowrap" }}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredInvoices().length === 0 ? (
                        <tr><td colSpan={10} style={{ padding: "32px 14px", textAlign: "center", color: MUTED }}>{t("admin.billing.noInvoicesMatch")}</td></tr>
                      ) : getFilteredInvoices().map((inv: any, idx: number) => {
                        const statusColors: Record<string, { bg: string; fg: string; border: string }> = {
                          pending: { bg: "rgba(217,119,6,0.08)", fg: "#D97706", border: "#D9770633" },
                          paid:    { bg: "rgba(22,163,74,0.08)", fg: "#16A34A", border: "#16A34A33" },
                          overdue: { bg: "rgba(220,38,38,0.08)", fg: "#DC2626", border: "#DC262633" },
                        };
                        const sc = statusColors[inv.status] ?? statusColors.pending;
                        return (
                          <tr key={inv.id} style={{ borderBottom: `1px solid ${BORDER}`, background: idx % 2 === 0 ? LIGHT : SURFACE }}>
                            <td style={{ padding: "12px 14px", fontWeight: 700, color: "#E5247B" }}>{inv.invoice_number}</td>
                            <td style={{ padding: "12px 14px", fontWeight: 600 }}>{inv.merchant_name}</td>
                            <td style={{ padding: "12px 14px", color: MUTED, whiteSpace: "nowrap" }}>{inv.period_start?.slice(0, 10)} &rarr; {inv.period_end?.slice(0, 10)}</td>
                            <td style={{ padding: "12px 14px", fontWeight: 600 }}>{fmt(Number(inv.transactions_volume ?? 0))}</td>
                            <td style={{ padding: "12px 14px", textAlign: "center" }}>{inv.transactions_count}</td>
                            <td style={{ padding: "12px 14px", fontWeight: 600 }}>{fmt(Number(inv.transactions_volume ?? 0) * 0.029 + Number(inv.transactions_count ?? 0) * 0.3)}</td>
                            <td style={{ padding: "12px 14px", fontWeight: 600 }}>{fmt(Number(inv.platform_fee ?? 97))}</td>
                            <td style={{ padding: "12px 14px", fontWeight: 800, color: "#E5247B" }}>{fmt(Number(inv.total_fees ?? 0))}</td>
                            <td style={{ padding: "12px 14px" }}>
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 10px", borderRadius: 20, fontSize: 11, fontWeight: 700, background: sc.bg, color: sc.fg, border: `1px solid ${sc.border}`, letterSpacing: "0.04em" }}>
                                <span style={{ fontSize: 7 }}>●</span> {inv.status}
                              </span>
                            </td>
                            <td style={{ padding: "12px 14px", whiteSpace: "nowrap" }}>
                              <button
                                onClick={() => {
                                  const w = window.open("", "_blank", "width=800,height=900");
                                  if (!w) return;
                                  w.document.write(`<!DOCTYPE html><html><head><title>Invoice ${inv.invoice_number}</title><style>
                                    body{font-family:'Inter',system-ui,sans-serif;padding:48px;color:#0F172A;max-width:760px;margin:0 auto}
                                    .header{display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:40px}
                                    .logo{font-size:28px;font-weight:900;background:linear-gradient(135deg,#2DBE60,#15B8C9,#7B4FBF);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
                                    .inv-num{font-size:24px;font-weight:800;color:#E5247B;margin-bottom:4px}
                                    .label{font-size:11px;color:#64748B;text-transform:uppercase;letter-spacing:0.06em;font-weight:700;margin-bottom:4px}
                                    .value{font-size:14px;font-weight:600;margin-bottom:12px}
                                    table{width:100%;border-collapse:collapse;margin:24px 0}
                                    th{background:#F8FAFC;padding:10px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.04em;color:#64748B;font-weight:700;border-bottom:1px solid rgba(0,0,0,0.07)}
                                    td{padding:10px 14px;border-bottom:1px solid rgba(0,0,0,0.05);font-size:13px}
                                    .total-row td{font-weight:800;font-size:15px;border-top:2px solid #E5247B;background:#FDF2F8}
                                    .footer{margin-top:40px;text-align:center;font-size:11px;color:#94A3B8}
                                    @media print{body{padding:24px}}
                                  </style></head><body>
                                    <div class="header">
                                      <div><div class="logo">ZeniPay</div><div style="font-size:12px;color:#64748B">Payment Processing Platform</div><div style="font-size:12px;color:#64748B;margin-top:2px">info@zenipay.ca | zenipay.ca</div></div>
                                      <div style="text-align:right"><div class="inv-num">${inv.invoice_number}</div><div style="font-size:12px;color:#64748B">Generated: ${new Date(inv.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}</div></div>
                                    </div>
                                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:32px">
                                      <div><div class="label">Bill To</div><div class="value">${inv.merchant_name}</div><div class="label">Merchant ID</div><div class="value" style="font-size:12px;color:#64748B">${inv.merchant_id}</div></div>
                                      <div><div class="label">Billing Period</div><div class="value">${inv.period_start?.slice(0, 10)} to ${inv.period_end?.slice(0, 10)}</div><div class="label">Status</div><div class="value" style="color:${sc.fg};font-weight:700">${inv.status.toUpperCase()}</div></div>
                                    </div>
                                    <table>
                                      <thead><tr><th>Description</th><th style="text-align:right">Amount</th></tr></thead>
                                      <tbody>
                                        <tr><td>Processing Fee (2.9% of $${Number(inv.transactions_volume ?? 0).toFixed(2)} volume)</td><td style="text-align:right">$${(Number(inv.transactions_volume ?? 0) * 0.029).toFixed(2)}</td></tr>
                                        <tr><td>Per-Transaction Fee ($0.30 x ${inv.transactions_count} transactions)</td><td style="text-align:right">$${(Number(inv.transactions_count ?? 0) * 0.3).toFixed(2)}</td></tr>
                                        <tr><td>Monthly Platform Fee</td><td style="text-align:right">$${Number(inv.platform_fee ?? 97).toFixed(2)}</td></tr>
                                        <tr class="total-row"><td>Total Due</td><td style="text-align:right;color:#E5247B">$${Number(inv.total_fees ?? 0).toFixed(2)}</td></tr>
                                      </tbody>
                                    </table>
                                    <div style="margin-top:24px;padding:16px;background:#F8FAFC;border-radius:8px;font-size:12px;color:#64748B">
                                      <strong>Payment Terms:</strong> Net 30 days. Please remit payment to ZeniPay Inc.<br/>
                                      <strong>Questions?</strong> Contact billing@zenipay.ca
                                    </div>
                                    <div class="footer"><hr style="border:none;border-top:1px solid #E2E8F0;margin:24px 0"/>ZeniPay Inc. | Payment Processing Platform | zenipay.ca</div>
                                  </body></html>`);
                                  w.document.close();
                                  setTimeout(() => w.print(), 500);
                                }}
                                style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${BORDER}`, background: SURFACE, fontSize: 11, fontWeight: 700, color: MUTED, cursor: "pointer" }}
                              >
                                {t("admin.billing.print")}
                              </button>
                              <button
                                onClick={() => showToast(`${t("admin.billing.invoiceEmailed")} ${inv.merchant_name}`)}
                                style={{ padding: "5px 12px", borderRadius: 8, border: `1px solid ${ZP_BLUE}33`, background: ZP_BLUE + "0D", fontSize: 11, fontWeight: 700, color: ZP_BLUE, cursor: "pointer", marginLeft: 6 }}
                              >
                                Email
                              </button>
                              {inv.status !== "paid" && (
                                <button
                                  onClick={async () => {
                                    const res = await fetch("/api/zenipay/admin/billing", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: inv.id, status: "paid" }) });
                                    const data = await res.json();
                                    if (data.invoice) { setBillingInvoices(prev => prev.map(x => x.id === inv.id ? data.invoice : x)); showToast(t("admin.billing.markedAsPaid")); }
                                  }}
                                  style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(22,163,74,0.3)", background: "rgba(22,163,74,0.08)", fontSize: 11, fontWeight: 700, color: "#16A34A", cursor: "pointer", marginLeft: 6 }}
                                >
                                  {t("admin.billing.paid")}
                                </button>
                              )}
                              {inv.status === "pending" && (
                                <button
                                  onClick={async () => {
                                    const res = await fetch("/api/zenipay/admin/billing", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: inv.id, status: "overdue" }) });
                                    const data = await res.json();
                                    if (data.invoice) { setBillingInvoices(prev => prev.map(x => x.id === inv.id ? data.invoice : x)); showToast(t("admin.billing.markedAsOverdue"), "error"); }
                                  }}
                                  style={{ padding: "5px 12px", borderRadius: 8, border: "1px solid rgba(220,38,38,0.3)", background: "rgba(220,38,38,0.08)", fontSize: 11, fontWeight: 700, color: "#DC2626", cursor: "pointer", marginLeft: 6 }}
                                >
                                  {t("admin.billing.overdue")}
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ════════════════ MARKETING ════════════════ */}
          {tab === "marketing" && (
            <div style={{ display: "grid", gap: 20 }}>
              <div style={{ background: "linear-gradient(135deg, #E5247B, #7B4FBF)", borderRadius: 16, padding: "24px 28px", color: "white" }}>
                <h2 style={{ margin: "0 0 8px", fontWeight: 900, fontSize: 22 }}>Email Marketing</h2>
                <p style={{ margin: 0, opacity: 0.8, fontSize: 14 }}>Send campaigns to sandbox merchants or scraped leads with professional templates</p>
              </div>

              {/* Template Selector */}
              <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 16px", fontWeight: 700 }}>Email Templates</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 12 }}>
                  {EMAIL_TEMPLATES.map(tpl => (
                    <button key={tpl.id} onClick={() => handleSelectTemplate(tpl.id)} style={{
                      padding: "16px 14px", borderRadius: 12, border: selectedTemplate === tpl.id ? "2px solid #7B4FBF" : "1px solid #e2e8f0",
                      background: selectedTemplate === tpl.id ? "rgba(123,79,191,0.06)" : "#f8fafc", cursor: "pointer", textAlign: "left", transition: "all 0.15s"
                    }}>
                      <div style={{ fontWeight: 700, fontSize: 13, color: "#0f172a", marginBottom: 4 }}>{tpl.name}</div>
                      <div style={{ fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>{tpl.subject.replace(/\{\{.*?\}\}/g, "...").slice(0, 50)}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Compose */}
              <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                <h3 style={{ margin: "0 0 16px", fontWeight: 700 }}>Compose Campaign</h3>
                <div style={{ display: "grid", gap: 14 }}>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div><label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Audience</label><select value={marketingAudience} onChange={e => setMarketingAudience(e.target.value)} style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14 }}><option value="sandbox">Sandbox Merchants ({CLIENTS.filter((c:any) => c.status === "sandbox").length})</option><option value="leads">Scraped Leads</option><option value="all">All Merchants ({CLIENTS.length})</option></select></div>
                    <div><label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Subject</label><input value={marketingSubject} onChange={e => setMarketingSubject(e.target.value)} placeholder="ZeniPay — Accept Payments Today" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }} /></div>
                  </div>
                  <div><label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Email Body (HTML)</label><textarea value={marketingBody} onChange={e => { setMarketingBody(e.target.value); setSelectedTemplate(""); }} rows={12} placeholder="<h1>Accept Payments with ZeniPay</h1><p>...</p>" style={{ width: "100%", padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, fontFamily: "monospace", boxSizing: "border-box", lineHeight: 1.5 }} /></div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#64748b" }}>From: info@zeniva.ca</span>
                      <button onClick={() => setShowPreview(!showPreview)} style={{ background: showPreview ? "#7B4FBF" : "#f1f5f9", color: showPreview ? "white" : "#475569", border: "1px solid #e2e8f0", borderRadius: 8, padding: "6px 14px", fontSize: 12, fontWeight: 600, cursor: "pointer" }}>{showPreview ? "Hide Preview" : "Preview"}</button>
                    </div>
                    <button onClick={handleSendCampaign} disabled={marketingSending || !marketingSubject || !marketingBody} style={{ background: marketingSending ? "#94a3b8" : "linear-gradient(135deg, #E5247B, #7B4FBF)", color: "white", border: "none", borderRadius: 10, padding: "12px 28px", fontWeight: 700, cursor: "pointer" }}>{marketingSending ? `Sending... ${marketingSent}` : "Send Campaign"}</button>
                  </div>
                </div>
              </div>

              {/* Preview Panel */}
              {showPreview && marketingBody && (
                <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                    <h3 style={{ margin: 0, fontWeight: 700 }}>Email Preview</h3>
                    <span style={{ fontSize: 12, color: "#94a3b8" }}>Subject: {marketingSubject || "(no subject)"}</span>
                  </div>
                  <div style={{ border: "1px solid #e2e8f0", borderRadius: 12, overflow: "hidden", background: "#f4f7fa" }}>
                    <iframe
                      srcDoc={marketingBody}
                      style={{ width: "100%", height: 600, border: "none" }}
                      title="Email Preview"
                      sandbox="allow-same-origin"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ════════════════ LEAD HUNTER ════════════════ */}
          {tab === "leads" && (
            <div style={{ display: "grid", gap: 20 }}>
              <div style={{ background: "linear-gradient(135deg, #F5A623, #E5247B)", borderRadius: 16, padding: "24px 28px", color: "white" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div>
                    <h2 style={{ margin: "0 0 8px", fontWeight: 900, fontSize: 22 }}>Lead Hunter</h2>
                    <p style={{ margin: 0, opacity: 0.8, fontSize: 14 }}>Find businesses online and pitch them ZeniPay</p>
                  </div>
                  <div style={{ display: "flex", gap: 8 }}>
                    <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 700 }}>
                      {scrapedLeads.length} leads
                    </span>
                    <span style={{ background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "6px 14px", fontSize: 13, fontWeight: 700 }}>
                      {scrapedLeads.filter(l => l.email).length} with email
                    </span>
                  </div>
                </div>
              </div>

              {/* Search + Manual Add */}
              <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                  <input value={scrapeQuery} onChange={e => setScrapeQuery(e.target.value)} placeholder="e.g. shopify store, e-commerce business, saas company" style={{ flex: 1, padding: "12px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14 }} onKeyDown={e => e.key === "Enter" && handleScrape()} />
                  <button onClick={handleScrape} disabled={scrapeLoading} style={{ background: scrapeLoading ? "#94a3b8" : "linear-gradient(135deg, #F5A623, #E5247B)", color: "white", border: "none", borderRadius: 10, padding: "12px 24px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap" }}>{scrapeLoading ? "Searching..." : "Search"}</button>
                  <button onClick={() => setShowManualAdd(!showManualAdd)} style={{ background: showManualAdd ? "#7B4FBF" : "#f1f5f9", color: showManualAdd ? "white" : "#475569", border: "1px solid #e2e8f0", borderRadius: 10, padding: "12px 20px", fontWeight: 700, cursor: "pointer", whiteSpace: "nowrap", fontSize: 13 }}>{showManualAdd ? "Cancel" : "+ Add Lead"}</button>
                </div>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {["shopify store", "e-commerce business", "saas company", "online store payments", "small business website", "freelance services", "subscription service"].map(q => (
                    <button key={q} onClick={() => setScrapeQuery(q)} style={{ background: scrapeQuery === q ? "rgba(245,166,35,0.1)" : "#f1f5f9", border: scrapeQuery === q ? "1px solid #F5A623" : "1px solid #e2e8f0", borderRadius: 8, padding: "6px 12px", fontSize: 11, cursor: "pointer", color: scrapeQuery === q ? "#F5A623" : "#475569", fontWeight: scrapeQuery === q ? 700 : 400 }}>{q}</button>
                  ))}
                </div>
              </div>

              {/* Manual Add Form */}
              {showManualAdd && (
                <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)", border: "2px solid #7B4FBF" }}>
                  <h3 style={{ margin: "0 0 16px", fontWeight: 700, color: "#7B4FBF" }}>Add Lead Manually</h3>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }}>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Business Name *</label>
                      <input value={manualLead.business_name} onChange={e => setManualLead(p => ({ ...p, business_name: e.target.value }))} placeholder="Acme Corp" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Email</label>
                      <input value={manualLead.email} onChange={e => setManualLead(p => ({ ...p, email: e.target.value }))} placeholder="contact@acme.com" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Website</label>
                      <input value={manualLead.website} onChange={e => setManualLead(p => ({ ...p, website: e.target.value }))} placeholder="https://acme.com" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Phone</label>
                      <input value={manualLead.phone} onChange={e => setManualLead(p => ({ ...p, phone: e.target.value }))} placeholder="(555) 123-4567" style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }} />
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Sector</label>
                      <select value={manualLead.sector} onChange={e => setManualLead(p => ({ ...p, sector: e.target.value }))} style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14 }}>
                        {["E-commerce", "SaaS", "Professional Services", "Health & Wellness", "Education", "Travel & Hospitality", "Food & Beverage", "Fitness", "Real Estate", "Subscription", "Nonprofit", "Beauty & Personal Care", "Online Business", "Other"].map(s => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Description</label>
                      <input value={manualLead.description} onChange={e => setManualLead(p => ({ ...p, description: e.target.value }))} placeholder="Brief description..." style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }} />
                    </div>
                  </div>
                  <div style={{ marginTop: 14 }}>
                    <label style={{ display: "block", fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", marginBottom: 6 }}>Notes</label>
                    <textarea value={manualLead.notes} onChange={e => setManualLead(p => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Internal notes about this lead..." style={{ width: "100%", padding: "10px 14px", borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 14, boxSizing: "border-box" }} />
                  </div>
                  <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 16 }}>
                    <button onClick={handleManualAddLead} style={{ background: "linear-gradient(135deg, #7B4FBF, #E5247B)", color: "white", border: "none", borderRadius: 10, padding: "12px 28px", fontWeight: 700, cursor: "pointer" }}>Save Lead</button>
                  </div>
                </div>
              )}

              {/* Filter Bar */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {(["all", "new", "contacted", "converted", "lost"] as const).map(f => {
                  const count = f === "all" ? scrapedLeads.length : scrapedLeads.filter(l => l.status === f).length;
                  const colors: Record<string, string> = { all: "#475569", new: "#2DBE60", contacted: "#15B8C9", converted: "#7B4FBF", lost: "#DC2626" };
                  return (
                    <button key={f} onClick={() => setLeadStatusFilter(f)} style={{
                      background: leadStatusFilter === f ? colors[f] + "18" : "#f8fafc",
                      border: `1px solid ${leadStatusFilter === f ? colors[f] : "#e2e8f0"}`,
                      borderRadius: 20, padding: "6px 16px", fontSize: 12, cursor: "pointer",
                      color: leadStatusFilter === f ? colors[f] : "#64748b", fontWeight: leadStatusFilter === f ? 700 : 400
                    }}>
                      {f.charAt(0).toUpperCase() + f.slice(1)} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Results — Card Layout */}
              <div style={{ background: "white", borderRadius: 16, padding: 24, boxShadow: "0 1px 6px rgba(0,0,0,0.06)" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
                  <h3 style={{ margin: 0, fontWeight: 700 }}>Leads</h3>
                </div>
                {scrapedLeads.filter(l => leadStatusFilter === "all" || l.status === leadStatusFilter).length === 0 ? (
                  <p style={{ color: "#94a3b8", textAlign: "center", padding: "32px 0" }}>
                    {scrapedLeads.length === 0 ? "Search for businesses or add leads manually" : "No leads match this filter"}
                  </p>
                ) : (
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 16 }}>
                    {scrapedLeads.filter(l => leadStatusFilter === "all" || l.status === leadStatusFilter).map((lead: any) => {
                      const statusColors: Record<string, { bg: string; fg: string }> = {
                        new: { bg: "rgba(45,190,96,0.08)", fg: "#2DBE60" },
                        contacted: { bg: "rgba(21,184,201,0.08)", fg: "#15B8C9" },
                        converted: { bg: "rgba(123,79,191,0.08)", fg: "#7B4FBF" },
                        lost: { bg: "rgba(220,38,38,0.08)", fg: "#DC2626" },
                      };
                      const sc = statusColors[lead.status] || statusColors.new;
                      return (
                        <div key={lead.id} style={{ padding: 20, background: "#f8fafc", borderRadius: 14, border: "1px solid #e2e8f0", position: "relative", transition: "box-shadow 0.15s" }}>
                          {/* Header */}
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 800, fontSize: 15, color: "#0f172a", marginBottom: 4 }}>{lead.business_name || "Business"}</div>
                              <span style={{ display: "inline-block", padding: "2px 10px", borderRadius: 20, fontSize: 10, fontWeight: 700, background: sc.bg, color: sc.fg, border: `1px solid ${sc.fg}33`, letterSpacing: "0.04em", textTransform: "uppercase" }}>
                                {lead.status}
                              </span>
                            </div>
                            <div style={{ display: "flex", gap: 4 }}>
                              <select
                                value={lead.status}
                                onChange={e => handleUpdateLeadStatus(lead.id, e.target.value)}
                                style={{ padding: "4px 8px", borderRadius: 6, border: "1px solid #e2e8f0", fontSize: 11, background: "white", cursor: "pointer", color: "#475569" }}
                              >
                                <option value="new">New</option>
                                <option value="contacted">Contacted</option>
                                <option value="converted">Converted</option>
                                <option value="lost">Lost</option>
                              </select>
                              <button onClick={() => handleDeleteLead(lead.id)} style={{ background: "none", border: "1px solid #e2e8f0", borderRadius: 6, padding: "4px 8px", fontSize: 11, cursor: "pointer", color: "#94a3b8" }} title="Delete lead">x</button>
                            </div>
                          </div>

                          {/* Contact Info */}
                          <div style={{ display: "grid", gap: 6, marginBottom: 12 }}>
                            {lead.email && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                                <span style={{ color: "#94a3b8", fontSize: 11, minWidth: 14 }}>@</span>
                                <a href={`mailto:${lead.email}`} style={{ color: "#15B8C9", textDecoration: "none", fontWeight: 500 }}>{lead.email}</a>
                              </div>
                            )}
                            {lead.website && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                                <span style={{ color: "#94a3b8", fontSize: 11, minWidth: 14 }}>W</span>
                                <a href={lead.website} target="_blank" rel="noopener noreferrer" style={{ color: "#7B4FBF", textDecoration: "none", fontWeight: 500, wordBreak: "break-all" }}>{lead.website.replace(/^https?:\/\//, "").slice(0, 40)}</a>
                              </div>
                            )}
                            {lead.phone && (
                              <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                                <span style={{ color: "#94a3b8", fontSize: 11, minWidth: 14 }}>T</span>
                                <span style={{ color: "#475569" }}>{lead.phone}</span>
                              </div>
                            )}
                          </div>

                          {/* Sector + Source */}
                          <div style={{ display: "flex", gap: 8, marginBottom: 10, flexWrap: "wrap" }}>
                            <span style={{ background: "#f1f5f9", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 600, color: "#64748b" }}>{lead.sector || "General"}</span>
                            <span style={{ background: "#f1f5f9", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 600, color: "#94a3b8" }}>{lead.source}</span>
                            {lead.created_at && <span style={{ background: "#f1f5f9", borderRadius: 6, padding: "3px 8px", fontSize: 10, fontWeight: 600, color: "#94a3b8" }}>{fmtDate(lead.created_at)}</span>}
                          </div>

                          {/* Description */}
                          {lead.description && (
                            <p style={{ fontSize: 12, color: "#64748b", lineHeight: 1.5, margin: "0 0 12px", maxHeight: 48, overflow: "hidden" }}>{lead.description}</p>
                          )}

                          {/* Notes */}
                          {lead.notes && (
                            <div style={{ background: "rgba(245,166,35,0.06)", borderRadius: 8, padding: "8px 10px", fontSize: 11, color: "#92400e", marginBottom: 12, borderLeft: "3px solid #F5A623" }}>
                              {lead.notes}
                            </div>
                          )}

                          {/* Actions */}
                          <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            {lead.email && (
                              <button onClick={() => handleSendPitch(lead)} disabled={leadPitchSending === lead.id} style={{
                                background: leadPitchSending === lead.id ? "#94a3b8" : "linear-gradient(135deg, #2DBE60, #15B8C9)",
                                color: "white", border: "none", borderRadius: 8, padding: "8px 16px", fontSize: 12, fontWeight: 700, cursor: "pointer"
                              }}>
                                {leadPitchSending === lead.id ? "Sending..." : "Send Pitch"}
                              </button>
                            )}
                            {!lead.email && (
                              <span style={{ fontSize: 11, color: "#94a3b8", fontStyle: "italic", padding: "8px 0" }}>No email — add one to send pitch</span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ════════════════ SETTINGS ════════════════ */}
          {tab === "settings" && (
            <div>
              {/* Platform Settings — editable */}
              <div style={{ ...card({ padding: "24px", marginBottom: 16 }), borderTop: `3px solid ${ZP_GREEN}` }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 18, color: ZP_GREEN }}>{t("admin.settings.platformSettings")}</div>
                <div className="admin-settings-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16, marginBottom: 16 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>{t("admin.settings.platformName")}</label>
                    <input type="text" value={settings.platformName} onChange={e => setSettings(s => ({ ...s, platformName: e.target.value }))} style={{ ...inputStyle, width: "100%" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>{t("admin.settings.adminEmail")}</label>
                    <input type="email" value={settings.adminEmail} onChange={e => setSettings(s => ({ ...s, adminEmail: e.target.value }))} style={{ ...inputStyle, width: "100%" }} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 700, color: MUTED, display: "block", marginBottom: 6, textTransform: "uppercase" }}>{t("admin.settings.supportUrl")}</label>
                    <input type="text" value={settings.supportUrl} onChange={e => setSettings(s => ({ ...s, supportUrl: e.target.value }))} style={{ ...inputStyle, width: "100%" }} />
                  </div>
                </div>
              </div>

              {/* Fee Schedule — editable */}
              <div style={{ ...card({ padding: "24px", marginBottom: 16 }), borderTop: `3px solid ${ZP_CYAN}` }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 18, color: ZP_CYAN }}>{t("admin.settings.feeSchedule")}</div>
                <div className="admin-table-wrap">
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: `1px solid ${BORDER}` }}>
                      {[t("admin.clients.plan"), t("admin.settings.rate"), t("admin.settings.perTransaction")].map(h => (
                        <th key={h} style={{ padding: "10px 14px", textAlign: "left", fontSize: 11, fontWeight: 700, color: MUTED, textTransform: "uppercase" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { plan: "Standard", pctKey: "standardPct" as const, txKey: "standardPerTx" as const, color: ZP_GREEN },
                      { plan: "Business", pctKey: "businessPct" as const, txKey: "businessPerTx" as const, color: ZP_CYAN },
                      { plan: "Complete", pctKey: "completePct" as const, txKey: "completePerTx" as const, color: ZP_PURPLE },
                    ].map(row => (
                      <tr key={row.plan} style={{ borderBottom: `1px solid ${BORDER}` }}>
                        <td style={{ padding: "12px 14px", fontWeight: 700, color: row.color }}>{row.plan}</td>
                        <td style={{ padding: "12px 14px" }}>
                          <input type="text" value={settings[row.pctKey]} onChange={e => setSettings(s => ({ ...s, [row.pctKey]: e.target.value }))} style={{ ...inputStyle, width: 80 }} /> %
                        </td>
                        <td style={{ padding: "12px 14px" }}>
                          $ <input type="text" value={settings[row.txKey]} onChange={e => setSettings(s => ({ ...s, [row.txKey]: e.target.value }))} style={{ ...inputStyle, width: 80 }} /> /tx
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <button
                  disabled={settingsLoading}
                  onClick={async () => {
                    setSettingsLoading(true);
                    try {
                      const res = await fetch("/api/zenipay/admin/actions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({
                          action: "save_settings",
                          merchant_id: "zeniva-001",
                          settings: {
                            platform_name: settings.platformName,
                            admin_email: settings.adminEmail,
                            support_url: settings.supportUrl,
                            fee_standard_pct: settings.standardPct,
                            fee_standard_per_tx: settings.standardPerTx,
                            fee_business_pct: settings.businessPct,
                            fee_business_per_tx: settings.businessPerTx,
                            fee_complete_pct: settings.completePct,
                            fee_complete_per_tx: settings.completePerTx,
                          },
                        }),
                      });
                      if (res.ok) showToast(t("admin.settings.settingsSaved"));
                      else { const data = await res.json(); showToast(data.error || t("admin.settings.saveFailed"), "error"); }
                    } catch { showToast(t("admin.settings.saveNetworkError"), "error"); }
                    finally { setSettingsLoading(false); }
                  }}
                  style={{ marginTop: 16, padding: "10px 28px", borderRadius: 10, background: ZP_GRAD, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", boxShadow: "0 4px 12px rgba(45,190,96,0.18)", opacity: settingsLoading ? 0.6 : 1, display: "flex", alignItems: "center", gap: 8 }}
                >
                  {settingsLoading ? <Spinner size={14} /> : null}
                  {t("admin.settings.saveSettings")}
                </button>
              </div>

              {/* Finix — read-only with test */}
              <div style={{ ...card({ padding: "24px", marginBottom: 16 }), borderTop: `3px solid ${ZP_PURPLE}` }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 18 }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: ZP_PURPLE }}>{t("admin.settings.finixProcessor")}</div>
                  <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                    {finixTestResult && (
                      <span style={{ fontSize: 12, fontWeight: 700, color: finixTestResult === "success" ? ZP_GREEN : "#DC2626" }}>
                        {finixTestResult === "success" ? t("admin.settings.connected") : t("admin.transactions.failed")}
                      </span>
                    )}
                    <button
                      onClick={async () => {
                        setFinixTestResult(null);
                        try {
                          const res = await fetch("/api/zenipay/stats");
                          setFinixTestResult(res.ok ? "success" : "fail");
                        } catch { setFinixTestResult("fail"); }
                      }}
                      style={{ padding: "6px 16px", borderRadius: 8, border: `1px solid ${ZP_PURPLE}33`, background: ZP_PURPLE + "0D", fontSize: 11, fontWeight: 700, color: ZP_PURPLE, cursor: "pointer" }}
                    >
                      {t("admin.overview.testConnection")}
                    </button>
                    <a href="https://dashboard.finix.com" target="_blank" rel="noreferrer" style={{ padding: "6px 16px", borderRadius: 8, background: ZP_GRAD, color: "#fff", fontSize: 11, fontWeight: 700, textDecoration: "none" }}>Finix Portal →</a>
                  </div>
                </div>
                {[
                  { k: "Account ID",   v: GATEWAY_STATUS.accountId },
                  { k: "Environment",  v: "Sandbox" },
                  { k: "Fees",         v: GATEWAY_STATUS.fees },
                  { k: "Webhook",      v: GATEWAY_STATUS.webhook },
                  { k: "HMAC",         v: "Enabled" },
                ].map(s => (
                  <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                    <span style={{ color: MUTED }}>{s.k}</span>
                    <span style={{ fontWeight: 700 }}>{s.v}</span>
                  </div>
                ))}
              </div>

              {/* Other read-only sections */}
              <div className="admin-grid-2" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
                <div style={{ ...card({ padding: "24px" }), borderTop: `3px solid ${ZP_BLUE}` }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 18, color: ZP_BLUE }}>{t("admin.settings.unitBanking")}</div>
                  {[
                    { k: "Routing",     v: "812345678" },
                    { k: "Account",     v: "••••5847" },
                    { k: "Customer ID", v: "4647873" },
                    { k: "Card ID",     v: "5487715" },
                    { k: "Status",      v: "Active" },
                  ].map(s => (
                    <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                      <span style={{ color: MUTED }}>{s.k}</span>
                      <span style={{ fontWeight: 700 }}>{s.v}</span>
                    </div>
                  ))}
                </div>

                <div style={{ ...card({ padding: "24px" }), borderTop: `3px solid #D97706` }}>
                  <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 18, color: "#D97706" }}>{t("admin.settings.chartOfAccounts")}</div>
                  {[
                    { k: "1000", v: "Platform Wallet · Asset" },
                    { k: "2000", v: "Commissions Payable · Liability" },
                    { k: "4000", v: "Travel Revenue · Revenue" },
                    { k: "5000", v: "Agent Commissions · Expense" },
                    { k: "5100", v: "Processor Fees · Expense" },
                  ].map(s => (
                    <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "10px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 13 }}>
                      <span style={{ color: MUTED }}>{s.k}</span>
                      <span style={{ fontWeight: 700 }}>{s.v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Danger Zone */}
              <div style={{ ...card({ padding: "24px" }), borderTop: "3px solid #DC2626" }}>
                <div style={{ fontWeight: 800, fontSize: 15, marginBottom: 12, color: "#DC2626" }}>{t("admin.settings.dangerZone")}</div>
                <div style={{ fontSize: 13, color: MUTED, marginBottom: 16 }}>{t("admin.settings.dangerDesc")}</div>
                <button
                  onClick={async () => {
                    if (!confirm("Are you sure you want to clear all test/sandbox data? This cannot be undone.")) return;
                    if (!confirm("FINAL WARNING: This will permanently delete all sandbox transactions, payouts, and test data. Continue?")) return;
                    try {
                      const res = await fetch("/api/zenipay/admin/actions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "clear_test_data", merchant_id: "zeniva-001" }),
                      });
                      if (res.ok) { showToast(t("admin.settings.testDataCleared")); loadMerchants(); loadStats(); }
                      else { const data = await res.json(); showToast(data.error || t("admin.settings.clearDataFailed"), "error"); }
                    } catch { showToast(t("admin.settings.clearDataFailed"), "error"); }
                  }}
                  style={{ padding: "10px 24px", borderRadius: 10, border: "2px solid #DC2626", background: "rgba(220,38,38,0.06)", color: "#DC2626", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                >
                  {t("admin.settings.clearTestData")}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>

      {/* ════════════════ MERCHANT REVIEW MODAL ════════════════ */}
      {reviewMerchant && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1000, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={() => setReviewMerchant(null)}>
          <div style={{ background: SURFACE, borderRadius: 20, width: "100%", maxWidth: 720, maxHeight: "90vh", overflow: "auto", boxShadow: "0 24px 48px rgba(0,0,0,0.2)", border: `1px solid ${BORDER}` }} onClick={e => e.stopPropagation()}>
            {/* Header */}
            <div style={{ padding: "20px 24px", borderBottom: `1px solid ${BORDER}`, display: "flex", alignItems: "center", justifyContent: "space-between", background: "#FEF3C7" }}>
              <div>
                <div style={{ fontWeight: 900, fontSize: 18, color: "#92400E" }}>Merchant Review</div>
                <div style={{ fontSize: 13, color: "#B45309", marginTop: 2 }}>{reviewMerchant.name} - Application Review</div>
              </div>
              <button onClick={() => setReviewMerchant(null)} style={{ width: 32, height: 32, borderRadius: 8, border: "none", background: "rgba(0,0,0,0.08)", cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>x</button>
            </div>

            <div style={{ padding: "24px" }}>
              {/* Business Info */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: ZP_GREEN, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Business Info</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px" }}>
                  {[
                    { k: "Business Name", v: reviewMerchant.name },
                    { k: "DBA", v: reviewMerchant.merchant_data?.dba || reviewMerchant.merchant_data?.businessName || "—" },
                    { k: "Email", v: reviewMerchant.contact },
                    { k: "Phone", v: reviewMerchant.phone },
                    { k: "Website", v: reviewMerchant.domain },
                    { k: "Type", v: reviewMerchant.description },
                    { k: "Country", v: reviewMerchant.country },
                    { k: "Tax ID", v: reviewMerchant.merchant_data?.tax_id || reviewMerchant.merchant_data?.taxId || "—" },
                    { k: "MCC", v: reviewMerchant.merchant_data?.mcc || "—" },
                    { k: "Address", v: reviewMerchant.merchant_data?.address || reviewMerchant.merchant_data?.businessAddress?.line1 || "—" },
                  ].map(s => (
                    <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 12 }}>
                      <span style={{ color: MUTED }}>{s.k}</span>
                      <span style={{ fontWeight: 600, maxWidth: 180, textAlign: "right", wordBreak: "break-all" }}>{s.v || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Owner KYC */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: ZP_CYAN, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Owner KYC</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px" }}>
                  {[
                    { k: "First Name", v: reviewMerchant.merchant_data?.ownerFirstName || reviewMerchant.merchant_data?.owner?.firstName || "—" },
                    { k: "Last Name", v: reviewMerchant.merchant_data?.ownerLastName || reviewMerchant.merchant_data?.owner?.lastName || reviewMerchant.ownerName },
                    { k: "Title", v: reviewMerchant.merchant_data?.ownerTitle || reviewMerchant.merchant_data?.owner?.title || "—" },
                    { k: "Ownership %", v: reviewMerchant.merchant_data?.ownershipPct || reviewMerchant.merchant_data?.owner?.ownershipPercentage || "—" },
                    { k: "DOB", v: reviewMerchant.merchant_data?.ownerDob || reviewMerchant.merchant_data?.owner?.dob || "—" },
                    { k: "SSN Last 4", v: reviewMerchant.merchant_data?.ssnLast4 || reviewMerchant.merchant_data?.owner?.ssnLast4 || "****" },
                    { k: "Address", v: reviewMerchant.merchant_data?.ownerAddress || reviewMerchant.merchant_data?.owner?.address?.line1 || "—" },
                  ].map(s => (
                    <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 12 }}>
                      <span style={{ color: MUTED }}>{s.k}</span>
                      <span style={{ fontWeight: 600, maxWidth: 180, textAlign: "right", wordBreak: "break-all" }}>{s.v || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bank Account */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: ZP_BLUE, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Bank Account</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px" }}>
                  {[
                    { k: "Bank Name", v: reviewMerchant.merchant_data?.bankName || reviewMerchant.merchant_data?.bank?.name || "—" },
                    { k: "Routing", v: reviewMerchant.merchant_data?.routingNumber || reviewMerchant.merchant_data?.bank?.routingNumber || "—" },
                    { k: "Account", v: reviewMerchant.merchant_data?.accountNumber ? "****" + String(reviewMerchant.merchant_data.accountNumber).slice(-4) : reviewMerchant.merchant_data?.bank?.accountLast4 ? "****" + reviewMerchant.merchant_data.bank.accountLast4 : "—" },
                    { k: "Type", v: reviewMerchant.merchant_data?.accountType || reviewMerchant.merchant_data?.bank?.type || "—" },
                  ].map(s => (
                    <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 12 }}>
                      <span style={{ color: MUTED }}>{s.k}</span>
                      <span style={{ fontWeight: 600 }}>{s.v || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Finix Status */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontWeight: 800, fontSize: 13, color: ZP_PURPLE, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Finix Status</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px 20px" }}>
                  {[
                    { k: "Identity ID", v: reviewMerchant.merchant_data?.finix_identity_id || reviewMerchant.merchant_data?.identityId || "—" },
                    { k: "Merchant ID", v: reviewMerchant.merchant_data?.finix_merchant_id || reviewMerchant.merchant_data?.merchantId || "—" },
                    { k: "Onboarding State", v: reviewMerchant.onboarding_state || "—" },
                  ].map(s => (
                    <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 12 }}>
                      <span style={{ color: MUTED }}>{s.k}</span>
                      <span style={{ fontWeight: 600, maxWidth: 220, textAlign: "right", wordBreak: "break-all" }}>{s.v || "—"}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Tests & Submission */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 20 }}>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#D97706", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Tests Passed</div>
                  {[
                    { k: "Pay Link", v: reviewMerchant.merchant_data?.tests?.paylink ? "Yes" : "No" },
                    { k: "Success Test", v: reviewMerchant.merchant_data?.tests?.success ? "Yes" : "No" },
                    { k: "Fail Test", v: reviewMerchant.merchant_data?.tests?.fail ? "Yes" : "No" },
                  ].map(s => (
                    <div key={s.k} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 12 }}>
                      <span style={{ color: MUTED }}>{s.k}</span>
                      <span style={{ fontWeight: 700, color: s.v === "Yes" ? "#16A34A" : "#DC2626" }}>{s.v}</span>
                    </div>
                  ))}
                </div>
                <div>
                  <div style={{ fontWeight: 800, fontSize: 13, color: "#D97706", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>Submission</div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 12 }}>
                    <span style={{ color: MUTED }}>Submitted</span>
                    <span style={{ fontWeight: 600 }}>{reviewMerchant.merchant_data?.submitted_at ? fmtDateTime(reviewMerchant.merchant_data.submitted_at) : fmtDate(reviewMerchant.createdAt)}</span>
                  </div>
                  <div style={{ display: "flex", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${BORDER}`, fontSize: 12 }}>
                    <span style={{ color: MUTED }}>Plan</span>
                    <span style={{ fontWeight: 600 }}>{reviewMerchant.plan}</span>
                  </div>
                </div>
              </div>

              {/* Approve / Reject buttons */}
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 20, display: "flex", gap: 12, alignItems: "flex-start", flexWrap: "wrap" }}>
                <button
                  disabled={reviewLoading}
                  onClick={async () => {
                    setReviewLoading(true);
                    try {
                      const res = await fetch("/api/zenipay/admin/actions", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ action: "approve_merchant", merchant_id: reviewMerchant.id }),
                      });
                      const data = await res.json();
                      if (res.ok) {
                        showToast(`${reviewMerchant.name} approved successfully`, "success");
                        setReviewMerchant(null);
                        loadMerchants();
                        loadStats();
                      } else {
                        showToast(data.error || "Approval failed", "error");
                      }
                    } catch { showToast("Network error", "error"); }
                    finally { setReviewLoading(false); }
                  }}
                  style={{ padding: "10px 28px", borderRadius: 10, background: ZP_GREEN, border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", gap: 6 }}
                >
                  {reviewLoading ? <Spinner size={12} color="#fff" /> : null} Approve Merchant
                </button>

                {!showRejectInput ? (
                  <button
                    onClick={() => setShowRejectInput(true)}
                    style={{ padding: "10px 28px", borderRadius: 10, background: "rgba(220,38,38,0.06)", border: "2px solid #DC2626", color: "#DC2626", fontSize: 13, fontWeight: 700, cursor: "pointer" }}
                  >
                    Reject
                  </button>
                ) : (
                  <div style={{ display: "flex", gap: 8, alignItems: "center", flex: 1 }}>
                    <input
                      type="text"
                      placeholder="Reason for rejection..."
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      style={{ ...inputStyle, flex: 1, minWidth: 180 }}
                    />
                    <button
                      disabled={reviewLoading || !rejectReason.trim()}
                      onClick={async () => {
                        setReviewLoading(true);
                        try {
                          const res = await fetch("/api/zenipay/admin/actions", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ action: "reject_merchant", merchant_id: reviewMerchant.id, reason: rejectReason.trim() }),
                          });
                          const data = await res.json();
                          if (res.ok) {
                            showToast(`${reviewMerchant.name} rejected`, "success");
                            setReviewMerchant(null);
                            setRejectReason("");
                            setShowRejectInput(false);
                            loadMerchants();
                            loadStats();
                          } else {
                            showToast(data.error || "Rejection failed", "error");
                          }
                        } catch { showToast("Network error", "error"); }
                        finally { setReviewLoading(false); }
                      }}
                      style={{ padding: "10px 20px", borderRadius: 10, background: "#DC2626", border: "none", color: "#fff", fontSize: 13, fontWeight: 700, cursor: rejectReason.trim() ? "pointer" : "not-allowed", opacity: rejectReason.trim() ? 1 : 0.5 }}
                    >
                      {reviewLoading ? <Spinner size={12} color="#fff" /> : null} Confirm Reject
                    </button>
                    <button onClick={() => { setShowRejectInput(false); setRejectReason(""); }} style={{ padding: "10px 14px", borderRadius: 10, border: `1px solid ${BORDER}`, background: SURFACE, fontSize: 12, fontWeight: 600, cursor: "pointer", color: MUTED }}>Cancel</button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Ben AI Floating Chat */}
      <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999 }}>
        {benOpen && (
          <div style={{ width: 380, height: 500, background: "#0B1B4D", borderRadius: 20, border: "1px solid rgba(255,255,255,0.15)", display: "flex", flexDirection: "column", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", marginBottom: 12 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.1)", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{ width: 32, height: 32, borderRadius: 8, background: "linear-gradient(135deg, #2DBE60, #15B8C9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🤖</div>
                <div><div style={{ color: "white", fontWeight: 700, fontSize: 14 }}>Ben AI</div><div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>Admin Assistant</div></div>
              </div>
              <button onClick={() => setBenOpen(false)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 18 }}>×</button>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 8 }}>
              {benChat.length === 0 && <div style={{ textAlign: "center", color: "rgba(255,255,255,0.3)", fontSize: 13, paddingTop: 40 }}>Ask Ben about clients, revenue, leads, marketing...</div>}
              {benChat.map((m, i) => (
                <div key={i} style={{ display: "flex", justifyContent: m.role === "user" ? "flex-end" : "flex-start" }}>
                  <div style={{ background: m.role === "user" ? "linear-gradient(135deg, #15B8C9, #0B1B4D)" : "rgba(255,255,255,0.08)", color: "white", borderRadius: 12, padding: "10px 14px", maxWidth: "85%", fontSize: 13, whiteSpace: "pre-wrap", lineHeight: 1.5 }}>{m.text}</div>
                </div>
              ))}
              {benLoading && <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 12 }}>Thinking...</div>}
            </div>
            <div style={{ padding: "10px 14px", borderTop: "1px solid rgba(255,255,255,0.1)", display: "flex", gap: 8 }}>
              <input value={benMsg} onChange={e => setBenMsg(e.target.value)} onKeyDown={e => e.key === "Enter" && handleBenSend()} placeholder="Ask Ben..." style={{ flex: 1, background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 14px", color: "white", fontSize: 13, outline: "none" }} />
              <button onClick={handleBenSend} style={{ background: "linear-gradient(135deg, #2DBE60, #15B8C9)", border: "none", borderRadius: 10, padding: "10px 16px", color: "white", fontWeight: 700, cursor: "pointer" }}>↑</button>
            </div>
          </div>
        )}
        <button onClick={() => setBenOpen(!benOpen)} style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg, #2DBE60, #15B8C9, #7B4FBF)", border: "none", cursor: "pointer", fontSize: 24, boxShadow: "0 8px 32px rgba(45,190,96,0.4)", display: "flex", alignItems: "center", justifyContent: "center", color: "white" }}>
          {benOpen ? "×" : "🤖"}
        </button>
      </div>

    </div>
  );
}
