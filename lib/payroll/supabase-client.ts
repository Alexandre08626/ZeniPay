// Client Supabase du schéma `payroll`.
//
// Le service_role contourne la RLS : toute route qui utilise ce client doit
// vérifier elle-même que l'utilisateur appartient bien à l'employeur visé.
// Voir `assertMember()` dans access.ts — ne jamais requêter sans passer par là.

import { createClient } from "@supabase/supabase-js";

// Le schéma `payroll` n'est pas typé : on passe par any plutôt que de faire
// croire à une sécurité de types qu'on n'a pas.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyClient = any;

let _client: AnyClient = null;

export function getPayrollDb(): AnyClient {
  if (_client) return _client;
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("lib/payroll : SUPABASE_URL ou SUPABASE_SERVICE_ROLE_KEY manquante.");
  }
  _client = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema: "payroll" },
  });
  return _client;
}

/** Permet aux tests d'injecter un client simulé sans variables d'environnement. */
export function __setPayrollDbForTests(client: AnyClient): void {
  _client = client;
}
