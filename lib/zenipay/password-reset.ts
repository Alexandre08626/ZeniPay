// Password reset by email for merchant accounts.
//
// Passwords are only ever stored hashed (scrypt, config.password), so a
// forgotten password can't be read back — it's replaced. The link token is
// random (256 bits), stored as a SHA-256 hash in config.pw_reset, valid one
// hour and single-use. The Supabase Auth user (if any) gets the same new
// password so both login paths accept it.

import crypto from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { hashPassword } from "@/modules/zenipay/services/auth";
import { sendEmail } from "@/lib/email/send";

const TTL_MS = 60 * 60 * 1000;
const sha256 = (s: string) => crypto.createHash("sha256").update(s).digest("hex");

export const MIN_PASSWORD_LENGTH = 10;

async function findMerchantByEmail(supabase: SupabaseClient, email: string) {
  const e = email.trim().toLowerCase();
  const { data } = await supabase.from("zenipay_merchants").select("id, email, config");
  return (data || []).find((m: any) =>
    String(m.email || "").toLowerCase() === e || String((m.config || {}).email || "").toLowerCase() === e) || null;
}

/** Always resolves the same way whether or not the email exists (no account enumeration). */
export async function requestPasswordReset(supabase: SupabaseClient, email: string, baseUrl: string): Promise<void> {
  const m = await findMerchantByEmail(supabase, email);
  if (!m) return;
  const token = crypto.randomBytes(32).toString("base64url");
  const { data: fresh } = await supabase.from("zenipay_merchants").select("config").eq("id", m.id).maybeSingle();
  const cfg = (fresh?.config || {}) as Record<string, unknown>;
  await supabase.from("zenipay_merchants")
    .update({ config: { ...cfg, pw_reset: { hash: sha256(token), exp: Date.now() + TTL_MS } } })
    .eq("id", m.id);

  const link = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${token}`;
  const name = String(cfg.businessName || cfg.business_name || "votre compte");
  await sendEmail({
    to: String(m.email || email),
    subject: "Réinitialiser votre mot de passe ZeniPay",
    html: `<div style="font-family:Arial,sans-serif;font-size:14px;color:#334155;max-width:520px">
      <p>Bonjour,</p>
      <p>Une demande de nouveau mot de passe a été faite pour <b>${name.replace(/[<>&"]/g, "")}</b> sur ZeniPay.</p>
      <p style="margin:24px 0"><a href="${link}" style="background:#4f46e5;color:#fff;text-decoration:none;font-weight:700;padding:12px 22px;border-radius:10px;display:inline-block">Choisir un nouveau mot de passe</a></p>
      <p style="font-size:12px;color:#64748b">Ce lien est valide 1 heure et ne fonctionne qu'une fois. Si vous n'avez rien demandé, ignorez ce courriel : votre mot de passe actuel reste inchangé.</p>
      <p style="font-size:11px;color:#94a3b8;word-break:break-all">${link}</p></div>`,
  });
}

export async function completePasswordReset(
  supabase: SupabaseClient,
  token: string,
  newPassword: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!token || token.length < 20) return { ok: false, error: "Lien invalide." };
  if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD_LENGTH) {
    return { ok: false, error: `Le mot de passe doit avoir au moins ${MIN_PASSWORD_LENGTH} caractères.` };
  }
  const h = sha256(token);
  const { data } = await supabase.from("zenipay_merchants").select("id, email, config");
  const m = (data || []).find((r: any) => (r.config?.pw_reset?.hash || "") === h);
  if (!m) return { ok: false, error: "Lien invalide ou déjà utilisé." };
  const reset = (m.config as any).pw_reset;
  if (!reset.exp || Date.now() > Number(reset.exp)) return { ok: false, error: "Ce lien a expiré. Demandez-en un nouveau." };

  const hashed = await hashPassword(newPassword);
  const { data: fresh } = await supabase.from("zenipay_merchants").select("config").eq("id", m.id).maybeSingle();
  const { pw_reset: _used, ...cfg } = (fresh?.config || {}) as Record<string, unknown>;
  const { error } = await supabase.from("zenipay_merchants")
    .update({ config: { ...cfg, password: hashed } }).eq("id", m.id);
  if (error) return { ok: false, error: "Enregistrement impossible, réessayez." };

  // Keep Supabase Auth in sync so the primary login path works too.
  try {
    const email = String(m.email || "").toLowerCase();
    for (let page = 1; page <= 10; page++) {
      const { data: list } = await supabase.auth.admin.listUsers({ page, perPage: 200 });
      const u = (list?.users || []).find((x) => (x.email || "").toLowerCase() === email);
      if (u) { await supabase.auth.admin.updateUserById(u.id, { password: newPassword }); break; }
      if (!list || list.users.length < 200) break;
    }
  } catch { /* legacy login path still works */ }
  return { ok: true };
}
