export const dynamic = "force-dynamic";
/**
 * GET  /api/unit/cards — list all virtual cards
 * POST /api/unit/cards — create a new virtual debit card
 */

export async function GET() {
  try {
    const { listCards } = await import("../../../../modules/zenipay/gateways/unit");
    const cards = await listCards();
    return Response.json({ cards });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ cards: [], error: msg });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { account_id, full_name, limits } = body;
    if (!account_id || !full_name) {
      return Response.json({ error: "account_id and full_name required" }, { status: 400 });
    }
    const { createVirtualDebitCard } = await import("../../../../modules/zenipay/gateways/unit");
    const card = await createVirtualDebitCard({ accountId: account_id, fullName: full_name, limits });
    return Response.json({ card });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ error: msg }, { status: 500 });
  }
}
