// Shared types for the ZeniPay Agents product (Phase 1).
// Rows mirror agents.* tables 1:1 in the Supabase migration.

export type PlanTier = "free" | "startup" | "growth" | "enterprise";
export type OrgStatus = "active" | "suspended" | "deleted";
export type MemberRole = "owner" | "admin" | "member";
export type AgentStatus = "active" | "paused" | "revoked";
export type TxStatus = "authorized" | "captured" | "denied" | "failed" | "reversed";
export type ActorType = "user" | "agent" | "system" | "api_key";
export type Environment = "test" | "live";

export interface AgentOrganization {
  id: string;
  name: string;
  owner_user_id: string;
  plan_tier: PlanTier;
  status: OrgStatus;
  created_at: string;
  updated_at: string;
}

export interface AgentRow {
  id: string;
  organization_id: string;
  name: string;
  description: string | null;
  agent_type: string;
  public_key: string | null;
  status: AgentStatus;
  created_at: string;
  updated_at: string;
}

export interface AgentWallet {
  id: string;
  agent_id: string;
  organization_id: string;
  balance_cents: number;
  currency: string;
  finix_balance_ref: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentPolicy {
  id: string;
  wallet_id: string;
  organization_id: string;
  monthly_budget_cents: number | null;
  daily_cap_cents: number | null;
  per_tx_cap_cents: number | null;
  merchant_whitelist: string[];
  merchant_blacklist: string[];
  allowed_categories: string[];
  time_window_start: string | null; // "HH:MM:SS" UTC
  time_window_end: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface AgentTransaction {
  id: string;
  agent_id: string;
  wallet_id: string;
  organization_id: string;
  amount_cents: number;
  currency: string;
  merchant_id: string | null;
  category: string | null;
  status: TxStatus;
  protocol_used: string | null;
  policy_check_result: PolicyCheckResult;
  signature: string | null;
  idempotency_key: string | null;
  settled_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentApiKeyRow {
  id: string;
  organization_id: string;
  key_hash: string;
  key_prefix: string;
  environment: Environment;
  name: string;
  scopes: string[];
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
}

// Policy engine — shape of the policy_check_result JSONB payload.
export interface PolicyCheckResult {
  approved: boolean;
  reason: string;
  checks: Array<{
    rule:
      | "monthly_budget"
      | "daily_cap"
      | "per_tx_cap"
      | "merchant_whitelist"
      | "merchant_blacklist"
      | "allowed_categories"
      | "time_window"
      | "policy_active"
      | "wallet_balance";
    pass: boolean;
    detail?: string;
  }>;
}
