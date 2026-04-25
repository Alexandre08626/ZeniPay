// MX Technologies (Atrium) client wrapper.
//
// Auth: the MX dashboard gives you a base64 Basic-Auth value
// (client_id:api_key). We accept it pre-computed (MX_BASE_AUTH) OR
// compute it from MX_CLIENT_ID + MX_API_KEY if both are set.
//
// Docs: https://docs.mx.com/api/v1/
//   - POST /users                                         → create user
//   - GET  /users/{guid}                                  → read user
//   - POST /users/{guid}/connect_widget_url               → get widget URL
//   - GET  /users/{guid}/members                          → list connections
//   - GET  /users/{guid}/members/{m}/accounts             → list accounts
//   - GET  /users/{guid}/accounts/{a}                     → account detail
//   - GET  /institutions/{code}                           → institution (logo)
//
// All surface methods normalize to a thin object we control, so
// consumers don't have to handle MX's nested envelopes.

const BASE_URL = process.env.MX_BASE_URL ?? "https://int-api.mx.com";
const CLIENT_ID = process.env.MX_CLIENT_ID ?? "";
const API_KEY = process.env.MX_API_KEY ?? "";
const ENV_BASE_AUTH = process.env.MX_BASE_AUTH ?? "";

function basicAuth(): string {
  if (ENV_BASE_AUTH) return ENV_BASE_AUTH;
  if (CLIENT_ID && API_KEY) {
    return Buffer.from(`${CLIENT_ID}:${API_KEY}`).toString("base64");
  }
  return "";
}

function headers(): Record<string, string> {
  return {
    Authorization: `Basic ${basicAuth()}`,
    Accept: "application/vnd.mx.api.v1+json",
    "Content-Type": "application/json",
  };
}

export function isMXEnabled(): boolean {
  return !!(basicAuth());
}

async function mxRequest<T>(method: "GET" | "POST" | "PUT" | "DELETE", path: string, body?: unknown): Promise<{ status: number; data: T }> {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: headers(),
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    data = {} as T;
  }
  return { status: res.status, data };
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

interface UserEnvelope { user: { guid: string; id: string; is_disabled: boolean } }

/**
 * Return the MX user guid for a ZeniPay merchant — creating one if
 * it doesn't exist. We use `id` to store the merchant_id so we can
 * look the user up deterministically.
 */
export async function createOrGetUser(merchantId: string): Promise<string> {
  // MX lets us look up by `id` via list + filter — this avoids
  // duplicate-create errors when the user was already provisioned.
  const listRes = await mxRequest<{ users?: Array<{ guid: string; id?: string }> }>(
    "GET",
    `/users?id=${encodeURIComponent(merchantId)}`,
  );
  if (listRes.status < 400) {
    const match = (listRes.data.users ?? []).find((u) => u.id === merchantId);
    if (match) return match.guid;
  }
  const createRes = await mxRequest<UserEnvelope>("POST", "/users", {
    user: { id: merchantId, is_disabled: false },
  });
  if (createRes.status >= 400 || !createRes.data?.user?.guid) {
    throw new Error(`mx_create_user_failed ${createRes.status}`);
  }
  return createRes.data.user.guid;
}

// ---------------------------------------------------------------------------
// Connect widget
// ---------------------------------------------------------------------------

// MX returns the widget URL nested under `user.connect_widget_url`
// (not `widget_url.url`). Accept both shapes defensively so we don't
// regress if MX tweaks the envelope.
interface WidgetResponse {
  user?: { connect_widget_url?: string; guid?: string };
  widget_url?: { url?: string };
}

export async function getConnectWidgetUrl(params: {
  merchantId: string;
  connectionType: "business" | "personal";
}): Promise<{ url: string; userGuid: string }> {
  const userGuid = await createOrGetUser(params.merchantId);
  const res = await mxRequest<WidgetResponse>(
    "POST",
    `/users/${userGuid}/connect_widget_url`,
    {
      widget_url: {
        widget_type: "connect_widget",
        is_mobile_webview: false,
        mode: "verification",
        include_transactions: true,
      },
    },
  );
  const url = res.data?.user?.connect_widget_url ?? res.data?.widget_url?.url;
  if (res.status >= 400 || !url) {
    throw new Error(`mx_widget_url_failed ${res.status}`);
  }
  return { url, userGuid };
}

// ---------------------------------------------------------------------------
// Members + accounts
// ---------------------------------------------------------------------------

export interface MXAccount {
  guid: string;
  name: string;
  type: string;
  subtype?: string;
  balance: number;
  available_balance?: number;
  account_number?: string;
  routing_number?: string;
  institution_code?: string;
  currency_code?: string;
  member_guid: string;
}

export async function getMemberAccounts(userGuid: string, memberGuid: string): Promise<MXAccount[]> {
  const res = await mxRequest<{ accounts?: MXAccount[] }>(
    "GET",
    `/users/${userGuid}/members/${memberGuid}/accounts`,
  );
  return res.data?.accounts ?? [];
}

/**
 * Every account across every member for a user. Useful for the
 * "reconcile all" flow where we want DB rows for everything the
 * user has linked without caring which member they came from.
 */
export async function getAllAccounts(userGuid: string): Promise<MXAccount[]> {
  const res = await mxRequest<{ accounts?: MXAccount[] }>(
    "GET",
    `/users/${userGuid}/accounts`,
  );
  return res.data?.accounts ?? [];
}

/**
 * Trigger MX to refresh a member from the underlying bank. Balance
 * updates land on accounts ~5–15s later; caller should sleep + re-read.
 */
export async function aggregateMember(userGuid: string, memberGuid: string): Promise<void> {
  await mxRequest("POST", `/users/${userGuid}/members/${memberGuid}/aggregate`);
}

export async function getAccountDetail(userGuid: string, accountGuid: string): Promise<MXAccount | null> {
  const res = await mxRequest<{ account?: MXAccount }>(
    "GET",
    `/users/${userGuid}/accounts/${accountGuid}`,
  );
  return res.data?.account ?? null;
}

// ---------------------------------------------------------------------------
// Balance sync
// ---------------------------------------------------------------------------

export async function syncBalance(
  userGuid: string,
  accountGuid: string,
): Promise<{ balance: number; currency: string } | null> {
  const acct = await getAccountDetail(userGuid, accountGuid);
  if (!acct) return null;
  return {
    balance: Number(acct.balance ?? 0),
    currency: acct.currency_code ?? "CAD",
  };
}

// ---------------------------------------------------------------------------
// Institutions
// ---------------------------------------------------------------------------

export interface MXInstitution {
  code: string;
  name: string;
  medium_logo_url?: string;
  small_logo_url?: string;
}

export async function getInstitution(institutionCode: string): Promise<MXInstitution | null> {
  const res = await mxRequest<{ institution?: MXInstitution }>(
    "GET",
    `/institutions/${encodeURIComponent(institutionCode)}`,
  );
  return res.data?.institution ?? null;
}

// ---------------------------------------------------------------------------
// Bundle export
// ---------------------------------------------------------------------------

export const MXClient = {
  isMXEnabled,
  createOrGetUser,
  getConnectWidgetUrl,
  getMemberAccounts,
  getAllAccounts,
  getAccountDetail,
  aggregateMember,
  syncBalance,
  getInstitution,
};
