export const dynamic = "force-dynamic";

const UNIT_URL = () => process.env.UNIT_API_URL || "https://api.s.unit.sh";
const UNIT_TOKEN = () => process.env.UNIT_API_TOKEN || "";

function unitHeaders() {
  return {
    Authorization: `Bearer ${UNIT_TOKEN()}`,
    "Content-Type": "application/vnd.api+json",
  };
}

async function unitPost(path: string, body: unknown) {
  const res = await fetch(`${UNIT_URL()}${path}`, {
    method: "POST",
    headers: unitHeaders(),
    body: JSON.stringify(body),
  });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: false, status: res.status, data: { rawError: text.slice(0, 500) } }; }
}

async function unitGet(path: string) {
  const res = await fetch(`${UNIT_URL()}${path}`, { headers: unitHeaders() });
  const text = await res.text();
  try { return { ok: res.ok, status: res.status, data: JSON.parse(text) }; }
  catch { return { ok: false, status: res.status, data: { rawError: text.slice(0, 500) } }; }
}

export async function POST() {
  try {
    const token = UNIT_TOKEN();
    if (!token) {
      return Response.json({ error: "UNIT_API_TOKEN not configured" }, { status: 500 });
    }

    // ── Step 1: Check if customer already exists ──────────────────
    let customerId = "";
    const listRes = await unitGet("/customers?filter[email]=info%40zeniva.ca");
    if (listRes.ok && listRes.data?.data?.length > 0) {
      customerId = listRes.data.data[0].id;
    } else {
      // Create business customer with US address (Unit.co requires US)
      const custRes = await unitPost("/customers", {
        data: {
          type: "businessCustomer",
          attributes: {
            name: "Zeniva Travel LLC",
            ein: "12-3456789",
            phone: { countryCode: "1", number: "3322900021" },
            address: {
              street: "8 The Green",
              city: "Dover",
              state: "DE",
              postalCode: "19901",
              country: "US",
            },
            email: "info@zeniva.ca",
            website: "https://zenivatravel.com",
            stateOfIncorporation: "DE",
            entityType: "LLC",
            contact: {
              fullName: { first: "Alexandre", last: "Dupont" },
              email: "info@zeniva.ca",
              phone: { countryCode: "1", number: "3322900021" },
            },
            authorizedUsers: [],
          },
        },
      });

      if (!custRes.ok) {
        // Already exists with different filter — try listing all
        const allRes = await unitGet("/customers?page[limit]=20");
        const existing = allRes.data?.data?.find(
          (c: { attributes?: { email?: string } }) => c.attributes?.email === "info@zeniva.ca"
        );
        if (existing) {
          customerId = existing.id;
        } else {
          return Response.json(
            { error: "Failed to create Unit.co customer", details: custRes.data },
            { status: 500 }
          );
        }
      } else {
        customerId = custRes.data?.data?.id;
      }
    }

    if (!customerId) {
      return Response.json({ error: "Could not get customer ID from Unit.co" }, { status: 500 });
    }

    // ── Step 2: Check if account already exists ───────────────────
    const existingAccts = await unitGet(`/accounts?filter[customerId]=${customerId}`);
    if (existingAccts.ok && existingAccts.data?.data?.length > 0) {
      const acct = existingAccts.data.data[0];
      const existingCards = await unitGet(`/cards?filter[accountId]=${acct.id}`);
      const card = existingCards.data?.data?.[0];
      return Response.json({
        ok: true,
        alreadyExists: true,
        message: "Account already provisioned",
        account: {
          id: acct.id,
          customerId,
          routingNumber: acct.attributes?.routingNumber || "",
          accountNumber: acct.attributes?.accountNumber || "",
          balanceCents: acct.attributes?.balance || 0,
          status: acct.attributes?.status || "Open",
          currency: "USD",
        },
        card: card ? {
          id: card.id,
          last4: card.attributes?.last4Digits || "****",
          expiry: card.attributes?.expirationDate || "",
          type: "Virtual Visa Debit",
          status: card.attributes?.status || "Active",
        } : null,
      });
    }

    // ── Step 3: Create deposit account ───────────────────────────
    const acctRes = await unitPost("/accounts", {
      data: {
        type: "depositAccount",
        attributes: {
          depositProduct: "checking",
          idempotencyKey: `zeniva-acct-${customerId}`,
          tags: { purpose: "platform", org: "zeniva" },
        },
        relationships: {
          customer: { data: { type: "businessCustomer", id: customerId } },
        },
      },
    });

    if (!acctRes.ok) {
      return Response.json(
        { error: "Failed to create deposit account", details: acctRes.data },
        { status: 500 }
      );
    }

    const account = acctRes.data?.data;
    const accountId = account?.id;
    const routingNumber = account?.attributes?.routingNumber || "";
    const accountNumber = account?.attributes?.accountNumber || "";
    const balance = account?.attributes?.balance || 0;

    // ── Step 4: Issue virtual Visa debit card ─────────────────────
    const cardRes = await unitPost("/cards", {
      data: {
        type: "businessVirtualDebitCard",
        attributes: {
          fullName: { first: "Zeniva", last: "Travel LLC" },
          idempotencyKey: `zeniva-card-${accountId}`,
          tags: { purpose: "platform", holder: "admin" },
        },
        relationships: {
          account: { data: { type: "depositAccount", id: accountId } },
        },
      },
    });

    const card = cardRes.data?.data;
    const cardId = card?.id;
    const last4 = card?.attributes?.last4Digits || "****";
    const expiry = card?.attributes?.expirationDate || "";

    // ── Step 5: Persist to Supabase (non-fatal) ───────────────────
    try {
      const sbUrl = "https://mjkvkibdfteonvlahtag.supabase.co";
      const sbKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (sbUrl && sbKey) {
        const { createClient: sbCreate } = await import("@supabase/supabase-js");
        const sb = sbCreate(sbUrl, sbKey);
        await sb.from("zenipay_unit_accounts").upsert({
          id: accountId, customer_id: customerId, account_type: "depositAccount",
          routing_number: routingNumber, account_number: accountNumber,
          balance_cents: balance, available_cents: balance,
          status: account?.attributes?.status || "Open", currency: "USD",
          created_at: new Date().toISOString(),
        }, { onConflict: "id" });
        if (cardId) {
          await sb.from("zenipay_unit_cards").upsert({
            id: cardId, account_id: accountId, card_type: "businessVirtualDebitCard",
            last4, expiry_date: expiry, status: card?.attributes?.status || "Active",
            created_at: new Date().toISOString(),
          }, { onConflict: "id" });
        }
      }
    } catch (dbErr) {
      console.warn("[provision] Supabase persist failed (non-fatal):", dbErr);
    }

    return Response.json({
      ok: true,
      message: "ZeniPay banking provisioned successfully",
      account: {
        id: accountId, customerId, routingNumber, accountNumber,
        balanceCents: balance, status: account?.attributes?.status, currency: "USD",
      },
      card: cardId ? {
        id: cardId, last4, expiry, type: "Virtual Visa Debit",
        status: card?.attributes?.status,
      } : null,
    });

  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[provision] Error:", msg);
    return Response.json({ error: msg }, { status: 500 });
  }
}
