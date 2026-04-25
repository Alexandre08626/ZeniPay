// Plaid SDK wrapper.
//
// Env vars (set on Vercel):
//   PLAID_CLIENT_ID  — your Plaid client_id (24-char hex)
//   PLAID_SECRET     — env-specific secret (sandbox/dev/prod)
//   PLAID_ENV        — "sandbox" | "development" | "production"
//                      defaults to "sandbox"
//
// We never store the access_token in the UI. It lives only in
// zenipay_bank_connections.plaid_access_token (or an encrypted column
// when applied) and is used server-side for sync + funding.

import { Configuration, PlaidApi, PlaidEnvironments, Products, CountryCode } from "plaid";

const ENV = (process.env.PLAID_ENV ?? "sandbox") as keyof typeof PlaidEnvironments;
const CLIENT_ID = process.env.PLAID_CLIENT_ID ?? "";
const SECRET    = process.env.PLAID_SECRET ?? "";

export function isPlaidEnabled(): boolean {
  return !!CLIENT_ID && !!SECRET;
}

let _client: PlaidApi | null = null;
function client(): PlaidApi {
  if (_client) return _client;
  const config = new Configuration({
    basePath: PlaidEnvironments[ENV] ?? PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        "PLAID-CLIENT-ID": CLIENT_ID,
        "PLAID-SECRET": SECRET,
      },
    },
  });
  _client = new PlaidApi(config);
  return _client;
}

/**
 * Create a one-time link_token for the Plaid Link widget. The
 * client_user_id is our merchant_id so Plaid keeps users distinct.
 */
export async function createLinkToken(opts: {
  merchantId: string;
  clientName?: string;
  redirectUri?: string;
  // Country: CA + US is what we serve. Add more if/when needed.
  countries?: CountryCode[];
  // Products: 'auth' for ACH/EFT routing+account, 'transactions' for
  // transaction history. Start with auth — minimal scope.
  products?: Products[];
}): Promise<{ link_token: string; expiration: string }> {
  const res = await client().linkTokenCreate({
    user: { client_user_id: opts.merchantId },
    client_name: opts.clientName ?? "ZeniPay",
    products: opts.products ?? [Products.Auth],
    country_codes: opts.countries ?? [CountryCode.Ca, CountryCode.Us],
    language: "en",
    ...(opts.redirectUri ? { redirect_uri: opts.redirectUri } : {}),
  });
  return {
    link_token: res.data.link_token,
    expiration: res.data.expiration,
  };
}

/**
 * Exchange the public_token Plaid Link returns at the end of the
 * widget flow for a permanent access_token. We then call /accounts
 * + /auth/get to populate routing + account_number + balances.
 */
export async function exchangePublicToken(publicToken: string): Promise<{
  access_token: string;
  item_id: string;
}> {
  const res = await client().itemPublicTokenExchange({ public_token: publicToken });
  return {
    access_token: res.data.access_token,
    item_id: res.data.item_id,
  };
}

export interface PlaidAccount {
  account_id: string;
  name: string;
  official_name: string | null;
  type: string;
  subtype: string | null;
  mask: string | null;
  balances: {
    available: number | null;
    current: number | null;
    iso_currency_code: string | null;
  };
}

export interface PlaidAuthNumbers {
  account_id: string;
  routing: string | null;        // ACH (US)
  wire_routing: string | null;   // wire (US)
  account: string | null;        // full account number (used for ACH instrument creation, never persisted)
  institution: string | null;    // CA: institution number
  branch: string | null;         // CA: transit / branch
}

/**
 * Fetch all accounts for the linked item, plus auth numbers (ACH
 * routing + account, or CA institution+transit). Auth call is the
 * same Plaid endpoint that powers tools like Stripe ACH.
 */
export async function getAccountsAndAuth(accessToken: string): Promise<{
  item_id: string;
  institution_id: string | null;
  institution_name: string | null;
  accounts: PlaidAccount[];
  auth: PlaidAuthNumbers[];
}> {
  const [acctsRes, authRes, itemRes] = await Promise.all([
    client().accountsGet({ access_token: accessToken }),
    client().authGet({ access_token: accessToken }).catch(() => null),
    client().itemGet({ access_token: accessToken }),
  ]);

  const accounts: PlaidAccount[] = acctsRes.data.accounts.map((a) => ({
    account_id: a.account_id,
    name: a.name,
    official_name: a.official_name ?? null,
    type: String(a.type),
    subtype: a.subtype ? String(a.subtype) : null,
    mask: a.mask ?? null,
    balances: {
      available: a.balances?.available ?? null,
      current:   a.balances?.current ?? null,
      iso_currency_code: a.balances?.iso_currency_code ?? null,
    },
  }));

  // Plaid /auth/get returns ach + eft.
  const auth: PlaidAuthNumbers[] = [];
  if (authRes?.data) {
    for (const a of authRes.data.numbers.ach ?? []) {
      auth.push({ account_id: a.account_id, routing: a.routing, wire_routing: a.wire_routing ?? null, account: a.account, institution: null, branch: null });
    }
    for (const e of authRes.data.numbers.eft ?? []) {
      auth.push({ account_id: e.account_id, routing: null, wire_routing: null, account: e.account, institution: e.institution, branch: e.branch });
    }
  }

  let institutionId: string | null = null;
  let institutionName: string | null = null;
  const inst = itemRes.data.item.institution_id;
  if (inst) {
    institutionId = inst;
    try {
      const ir = await client().institutionsGetById({
        institution_id: inst,
        country_codes: [CountryCode.Ca, CountryCode.Us],
      });
      institutionName = ir.data.institution.name;
    } catch { /* best-effort */ }
  }

  return {
    item_id: itemRes.data.item.item_id,
    institution_id: institutionId,
    institution_name: institutionName,
    accounts,
    auth,
  };
}

/**
 * Refresh balances for an existing access_token. Plaid returns
 * cached balances by default; pass `min_last_updated_datetime` for
 * a forced refresh that pulls from the bank.
 */
export async function refreshBalances(accessToken: string): Promise<PlaidAccount[]> {
  const res = await client().accountsBalanceGet({ access_token: accessToken });
  return res.data.accounts.map((a) => ({
    account_id: a.account_id,
    name: a.name,
    official_name: a.official_name ?? null,
    type: String(a.type),
    subtype: a.subtype ? String(a.subtype) : null,
    mask: a.mask ?? null,
    balances: {
      available: a.balances?.available ?? null,
      current:   a.balances?.current ?? null,
      iso_currency_code: a.balances?.iso_currency_code ?? null,
    },
  }));
}

export const PlaidClient = {
  isPlaidEnabled,
  createLinkToken,
  exchangePublicToken,
  getAccountsAndAuth,
  refreshBalances,
};
