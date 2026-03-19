/**
 * ZeniPay × Unit.co — Banking Layer
 * Provides real bank accounts, virtual cards, ACH payments, wire transfers
 * Architecture: ZeniPay (our layer) → Unit (banking infrastructure) → Partner Bank
 *
 * Unit sandbox: https://api.s.unit.co
 * Unit production: https://api.unit.co
 * Docs: https://docs.unit.co
 */

// Read env vars lazily at call time (not at module load time) to ensure Vercel picks them up
function getUnitConfig() {
  const token = process.env.UNIT_API_TOKEN || "";
  const url = process.env.UNIT_API_URL || "https://api.s.unit.co";
  return { token, url };
}

function unitHeaders() {
  const { token } = getUnitConfig();
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/vnd.api+json",
  };
}

async function unitFetch(path: string, options?: RequestInit) {
  const { token, url: UNIT_API_URL } = getUnitConfig();
  if (!token) throw new Error("UNIT_API_TOKEN not configured");
  // Keep UNIT_API_URL in scope for the fetch below
  const res = await fetch(`${UNIT_API_URL}${path}`, {
    ...options,
    headers: { ...unitHeaders(), ...(options?.headers || {}) },
  });
  const text = await res.text();
  let data: Record<string, unknown>;
  try { data = JSON.parse(text); } catch { throw new Error(`Unit API parse error: ${text.slice(0, 200)}`); }
  if (!res.ok) {
    const errors = (data as { errors?: { title?: string; detail?: string }[] })?.errors;
    const msg = errors?.[0]?.detail || errors?.[0]?.title || `Unit API ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

// ── ACCOUNTS ────────────────────────────────────────────────────────────────

export async function listAccounts() {
  const data = await unitFetch("/accounts");
  return (data as { data: unknown[] }).data || [];
}

export async function getAccount(accountId: string) {
  const data = await unitFetch(`/accounts/${accountId}`);
  return (data as { data: unknown }).data;
}

export async function createDepositAccount(params: {
  customerId: string;
  name?: string;
  tags?: Record<string, string>;
}) {
  const body = {
    data: {
      type: "depositAccount",
      attributes: {
        depositProduct: "checking",
        tags: params.tags || { org: "Zeniva Travel" },
      },
      relationships: {
        customer: { data: { type: "businessCustomer", id: params.customerId } },
      },
    },
  };
  const data = await unitFetch("/accounts", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return (data as { data: unknown }).data;
}

// ── CUSTOMERS ───────────────────────────────────────────────────────────────

export async function listCustomers() {
  const data = await unitFetch("/customers");
  return (data as { data: unknown[] }).data || [];
}

export async function createBusinessCustomer(params: {
  name: string;
  email: string;
  phone?: string;
  address?: { street: string; city: string; state: string; postalCode: string; country: string };
  ein?: string;
}) {
  const body = {
    data: {
      type: "createBusinessCustomer",
      attributes: {
        name: params.name,
        contact: {
          fullName: { first: params.name.split(" ")[0] || "Zeniva", last: params.name.split(" ")[1] || "Travel" },
          email: params.email,
          phone: params.phone ? { countryCode: "1", number: params.phone.replace(/\D/g, "").slice(-10) } : undefined,
        },
        address: params.address || {
          street: "1209 Orange St",
          city: "Wilmington",
          state: "DE",
          postalCode: "19801",
          country: "US",
        },
        ein: params.ein || "000000000",
        stateOfIncorporation: "DE",
        entityType: "LLC",
        tags: { org: "Zeniva Travel" },
      },
    },
  };
  const data = await unitFetch("/customers", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return (data as { data: unknown }).data;
}

// ── CARDS ────────────────────────────────────────────────────────────────────

export async function listCards() {
  const data = await unitFetch("/cards");
  return (data as { data: unknown[] }).data || [];
}

export async function getCard(cardId: string) {
  const data = await unitFetch(`/cards/${cardId}`);
  return (data as { data: unknown }).data;
}

export async function createVirtualDebitCard(params: {
  accountId: string;
  fullName: string;
  phone?: string;
  email?: string;
  limits?: { dailyPurchase?: number; monthlyPurchase?: number };
}) {
  const body = {
    data: {
      type: "virtualDebitCard",
      attributes: {
        fullName: {
          first: params.fullName.split(" ")[0] || "Zeniva",
          last: params.fullName.split(" ").slice(1).join(" ") || "Travel",
        },
        shippingAddress: undefined,
        limits: params.limits ? {
          dailyPurchase: params.limits.dailyPurchase || 10000_00,
          monthlyPurchase: params.limits.monthlyPurchase || 50000_00,
        } : undefined,
        tags: { org: "Zeniva Travel" },
      },
      relationships: {
        account: { data: { type: "depositAccount", id: params.accountId } },
      },
    },
  };
  const data = await unitFetch("/cards", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return (data as { data: unknown }).data;
}

export async function getCardSensitiveData(cardId: string) {
  const data = await unitFetch(`/cards/${cardId}/secure-data/pan/cvv`);
  return (data as { data: unknown }).data;
}

export async function freezeCard(cardId: string) {
  const data = await unitFetch(`/cards/${cardId}/freeze`, { method: "POST", body: "{}" });
  return (data as { data: unknown }).data;
}

export async function unfreezeCard(cardId: string) {
  const data = await unitFetch(`/cards/${cardId}/unfreeze`, { method: "POST", body: "{}" });
  return (data as { data: unknown }).data;
}

// ── TRANSACTIONS ─────────────────────────────────────────────────────────────

export async function listTransactions(accountId?: string, limit = 50) {
  const params = new URLSearchParams({ "page[limit]": String(limit) });
  if (accountId) params.set("filter[accountId]", accountId);
  const data = await unitFetch(`/transactions?${params}`);
  return (data as { data: unknown[] }).data || [];
}

// ── PAYMENTS (ACH/Wire) ──────────────────────────────────────────────────────

export async function createACHPayment(params: {
  accountId: string;
  amount: number; // in cents
  direction: "Debit" | "Credit";
  counterpartyName: string;
  counterpartyRoutingNumber: string;
  counterpartyAccountNumber: string;
  counterpartyAccountType: "Checking" | "Savings";
  description: string;
  addenda?: string;
}) {
  const body = {
    data: {
      type: "achPayment",
      attributes: {
        amount: params.amount,
        direction: params.direction,
        description: params.description,
        addenda: params.addenda,
        counterparty: {
          name: params.counterpartyName,
          routingNumber: params.counterpartyRoutingNumber,
          accountNumber: params.counterpartyAccountNumber,
          accountType: params.counterpartyAccountType,
        },
      },
      relationships: {
        account: { data: { type: "depositAccount", id: params.accountId } },
      },
    },
  };
  const data = await unitFetch("/payments", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return (data as { data: unknown }).data;
}

export async function createBookPayment(params: {
  fromAccountId: string;
  toAccountId: string;
  amount: number; // in cents
  description: string;
}) {
  const body = {
    data: {
      type: "bookPayment",
      attributes: {
        amount: params.amount,
        description: params.description,
      },
      relationships: {
        account: { data: { type: "depositAccount", id: params.fromAccountId } },
        counterpartyAccount: { data: { type: "depositAccount", id: params.toAccountId } },
      },
    },
  };
  const data = await unitFetch("/payments", {
    method: "POST",
    body: JSON.stringify(body),
  });
  return (data as { data: unknown }).data;
}

// ── ACCOUNT BALANCE HELPER ───────────────────────────────────────────────────

export interface UnitAccount {
  id: string;
  type: string;
  attributes: {
    name?: string;
    status?: string;
    balance?: number; // cents
    available?: number; // cents
    hold?: number;
    routingNumber?: string;
    accountNumber?: string;
    currency?: string;
    createdAt?: string;
  };
}

export async function getAccountsSummary() {
  const accounts = await listAccounts() as UnitAccount[];
  return accounts.map(a => ({
    id: a.id,
    type: a.type,
    name: a.attributes.name || "Zeniva Account",
    status: a.attributes.status || "unknown",
    balanceCents: a.attributes.balance || 0,
    availableCents: a.attributes.available || 0,
    routingNumber: a.attributes.routingNumber || "",
    accountNumber: a.attributes.accountNumber ? `****${String(a.attributes.accountNumber).slice(-4)}` : "",
    currency: a.attributes.currency || "USD",
    createdAt: a.attributes.createdAt || "",
  }));
}
