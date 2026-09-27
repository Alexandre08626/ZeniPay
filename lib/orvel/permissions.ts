// Orvel permissions — one switch per capability, set by the merchant in
// /app/orvel. Anything switched on, Orvel executes on its own (no
// confirmation step; merchant's choice). Every action is journaled.

import type { SupabaseClient } from "@supabase/supabase-js";

export type OrvelPermission =
  | "read_data"
  | "invoices"
  | "reminders"
  | "pay_links"
  | "refunds"
  | "internal_transfers";

export interface PermissionDef {
  key: OrvelPermission;
  label: string;
  description: string;
  money: boolean;          // moves real money
  default: boolean;
}

export const PERMISSIONS: PermissionDef[] = [
  { key: "read_data", label: "Consulter vos données", description: "Soldes, paiements, factures, versements. Nécessaire pour presque tout.", money: false, default: true },
  { key: "invoices", label: "Créer et envoyer des factures", description: "Factures payables en entier ou en versements (dépôts), envoyées par courriel au client.", money: false, default: true },
  { key: "reminders", label: "Relancer les clients", description: "Renvoyer un lien de paiement ou un rappel pour un versement en attente.", money: false, default: true },
  { key: "pay_links", label: "Créer des liens de paiement", description: "Nouveaux liens à montant fixe à partager avec vos clients.", money: false, default: true },
  { key: "refunds", label: "Rembourser des clients", description: "Remboursement réel par Finix sur la carte du client (total ou partiel).", money: true, default: false },
  { key: "internal_transfers", label: "Déplacer de l'argent entre vos comptes", description: "Virements instantanés entre vos propres comptes ZeniPay.", money: true, default: false },
];

export interface OrvelSettings {
  enabled: boolean;
  permissions: Record<OrvelPermission, boolean>;
  persisted: boolean;      // false = table missing (migration not run) → defaults
}

export function defaultPermissions(): Record<OrvelPermission, boolean> {
  return Object.fromEntries(PERMISSIONS.map((p) => [p.key, p.default])) as Record<OrvelPermission, boolean>;
}

export async function getOrvelSettings(supabase: SupabaseClient, merchantId: string): Promise<OrvelSettings> {
  const base = defaultPermissions();
  try {
    const { data, error } = await supabase
      .from("zenipay_orvel_settings").select("*").eq("merchant_id", merchantId).maybeSingle();
    if (error) return { enabled: true, permissions: base, persisted: false };
    const saved = (data?.permissions || {}) as Record<string, unknown>;
    for (const p of PERMISSIONS) if (typeof saved[p.key] === "boolean") base[p.key] = saved[p.key] as boolean;
    return { enabled: data ? data.enabled !== false : true, permissions: base, persisted: true };
  } catch {
    return { enabled: true, permissions: base, persisted: false };
  }
}

export async function saveOrvelSettings(
  supabase: SupabaseClient,
  merchantId: string,
  patch: { enabled?: boolean; permissions?: Partial<Record<OrvelPermission, boolean>> },
): Promise<OrvelSettings> {
  const current = await getOrvelSettings(supabase, merchantId);
  const permissions = { ...current.permissions };
  for (const p of PERMISSIONS) {
    const v = patch.permissions?.[p.key];
    if (typeof v === "boolean") permissions[p.key] = v;
  }
  const enabled = typeof patch.enabled === "boolean" ? patch.enabled : current.enabled;
  const { error } = await supabase.from("zenipay_orvel_settings").upsert({
    merchant_id: merchantId, enabled, permissions, updated_at: new Date().toISOString(),
  }, { onConflict: "merchant_id" });
  if (error) throw new Error(error.code === "42P01" ? "MIGRATION_REQUIRED" : error.message);
  return { enabled, permissions, persisted: true };
}
