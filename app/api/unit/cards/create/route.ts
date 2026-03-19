import { NextResponse } from "next/server";

const UNIT_API = process.env.UNIT_API_URL || "https://api.s.unit.co";
const UNIT_TOKEN = process.env.UNIT_API_TOKEN;

export async function POST(req: Request) {
  if (!UNIT_TOKEN) return NextResponse.json({ error: "Unit not configured" }, { status: 500 });

  try {
    const { accountId, cardholderName = "ZENIVA TRAVEL LLC", type = "businessVirtualDebitCard" } = await req.json();
    if (!accountId) return NextResponse.json({ error: "accountId required" }, { status: 400 });

    const resp = await fetch(`${UNIT_API}/cards`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UNIT_TOKEN}`,
        "Content-Type": "application/vnd.api+json",
      },
      body: JSON.stringify({
        data: {
          type,
          attributes: { fullName: { first: cardholderName.split(" ")[0] || "Zeniva", last: cardholderName.split(" ").slice(1).join(" ") || "Travel" } },
          relationships: {
            account: { data: { type: "depositAccount", id: accountId } },
          },
        },
      }),
    });

    const data = await resp.json();
    if (!resp.ok) return NextResponse.json({ error: "Failed to issue card", details: data }, { status: 400 });
    return NextResponse.json({ ok: true, card: data.data });
  } catch (e: unknown) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
