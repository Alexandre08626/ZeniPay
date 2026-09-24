// Contrôle d'accès du module de paie.
//
// Le client du schéma `payroll` utilise le service_role et contourne donc la
// RLS. Chaque route doit vérifier elle-même l'appartenance à l'employeur : une
// requête qui saute cette étape expose les salaires de toutes les entreprises
// de la plateforme. Aucune lecture ne doit se faire sans passer par ici.

import { getPayrollDb } from "./supabase-client";

export type PayrollRole = "owner" | "admin" | "preparer" | "viewer";

const RANK: Record<PayrollRole, number> = { viewer: 0, preparer: 1, admin: 2, owner: 3 };

export class PayrollAccessError extends Error {
  constructor(
    message: string,
    public readonly status: 401 | 403 | 404
  ) {
    super(message);
    this.name = "PayrollAccessError";
  }
}

/**
 * Vérifie que l'utilisateur a au moins le rôle demandé chez cet employeur.
 * Retourne son rôle, ou lève une PayrollAccessError.
 *
 * On répond 404 plutôt que 403 quand l'utilisateur n'est pas membre : confirmer
 * qu'un identifiant d'employeur existe renseignerait un curieux.
 */
export async function assertMember(
  userId: string | undefined,
  employerId: string,
  minimum: PayrollRole = "viewer"
): Promise<PayrollRole> {
  if (!userId) throw new PayrollAccessError("Authentification requise.", 401);

  const db = getPayrollDb();
  const { data, error } = await db
    .from("members")
    .select("role")
    .eq("employer_id", employerId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw new PayrollAccessError("Vérification de l'accès impossible.", 403);
  if (!data) throw new PayrollAccessError("Employeur introuvable.", 404);

  const role = data.role as PayrollRole;
  if (RANK[role] < RANK[minimum]) {
    throw new PayrollAccessError(
      `Rôle ${role} insuffisant : ${minimum} requis pour cette action.`,
      403
    );
  }
  return role;
}

/** Employeur propriétaire d'un cycle de paie, pour vérifier l'accès ensuite. */
export async function employerIdForRun(runId: string): Promise<string> {
  const db = getPayrollDb();
  const { data, error } = await db
    .from("pay_runs")
    .select("employer_id")
    .eq("id", runId)
    .maybeSingle();
  if (error || !data) throw new PayrollAccessError("Cycle de paie introuvable.", 404);
  return data.employer_id as string;
}
