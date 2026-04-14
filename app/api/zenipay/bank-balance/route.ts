export const dynamic = "force-dynamic";

const UNIT_URL = () => process.env.UNIT_API_URL || "https://api.s.unit.sh";
const UNIT_TOKEN = () => process.env.UNIT_API_TOKEN || "";

// Known IDs for Zeniva Travel LLC (provisioned 2026-03-17)
const KNOWN_ACCOUNT_ID = "11589672";
const KNOWN_CARD_ID = "5487715";
const KNOWN_CUSTOMER_ID = "4647873";

function unitHeaders() {
  return {
    Authorization: `Bearer ${UNIT_TOKEN()}`,
    "Content-Type": "application/vnd.api+json",
  };
}

async function unitGet(path: string) {
  const res = await fetch(`${UNIT_URL()}${path}`, {
    headers: unitHeaders(),
    signal: AbortSignal.timeout(10000),
  });
  if (!res.ok) return null;
  const text = await res.text();
  try { return JSON.parse(text); } catch { return null; }
}

export async function GET() {
  try {
    const token = UNIT_TOKEN();
    if (!token) {
      return Response.json({ error: "UNIT_API_TOKEN not configured" }, { status: 500 });
    }

    // Fetch account + card + transactions in parallel
    const [acctData, cardData, txData] = await Promise.all([
      unitGet(`/accounts/${KNOWN_ACCOUNT_ID}`),
      unitGet(`/cards/${KNOWN_CARD_ID}`),
      unitGet(`/transactions?filter[accountId]=${KNOWN_ACCOUNT_ID}&page[limit]=20&sort=-createdAt`),
    ]);

    const acct = acctData?.data;
    const card = cardData?.data;
    const txs = txData?.data || [];

    if (!acct) {
      return Response.json({
        accounts: [], cards: [], transactions: [],
        message: "Account not found — please provision first",
      });
    }

    const attrs = acct.attributes || {};
    const cardAttrs = card?.attributes || {};

    return Response.json({
      accounts: [{
        id: acct.id,
        customerId: KNOWN_CUSTOMER_ID,
        type: acct.type,
        name: "ZeniPay Checking — Zeniva Travel LLC",
        status: attrs.status || "Open",
        balanceCents: attrs.balance || 0,
        availableCents: attrs.available || attrs.balance || 0,
        routingNumber: attrs.routingNumber || "",
        accountNumber: attrs.accountNumber || "",
        currency: attrs.currency || "USD",
        createdAt: attrs.createdAt || "",
        hold: attrs.hold || 0,
        overdraftLimit: attrs.overdraftLimit || 0,
      }],
      cards: card ? [{
        id: card.id,
        type: card.type,
        accountId: KNOWN_ACCOUNT_ID,
        // Flat fields (used by 360° modal)
        last4: cardAttrs.last4Digits || "",
        expiry: cardAttrs.expirationDate || "",
        status: cardAttrs.status || "Active",
        bin: cardAttrs.bin || "",
        holderName: "Zeniva Travel LLC",
        // attributes object (required by existing debit card display)
        attributes: {
          last4Digits: cardAttrs.last4Digits || "",
          expirationDate: cardAttrs.expirationDate || "",
          status: cardAttrs.status || "Active",
          bin: cardAttrs.bin || "",
        },
      }] : [],
      transactions: txs.map((tx: {
        id: string;
        type: string;
        attributes: {
          createdAt?: string;
          summary?: string;
          direction?: string;
          amount?: number;
          balance?: number;
          status?: string;
        };
      }) => ({
        id: tx.id,
        type: tx.type,
        date: tx.attributes?.createdAt || "",
        description: tx.attributes?.summary || tx.type,
        direction: tx.attributes?.direction || "Credit",
        amountCents: tx.attributes?.amount || 0,
        balanceCents: tx.attributes?.balance || 0,
        status: tx.attributes?.status || "Completed",
      })),
    });

  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : String(err), accounts: [], cards: [], transactions: [] },
      { status: 500 }
    );
  }
}
