export const dynamic = "force-dynamic";
/**
 * GET /api/unit/transactions?accountId=xxx — list Unit bank transactions
 */

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const accountId = url.searchParams.get("accountId") || undefined;
    const limit = parseInt(url.searchParams.get("limit") || "50");

    const { listTransactions } = await import("../../../../modules/zenipay/gateways/unit");
    const transactions = await listTransactions(accountId, limit);
    return Response.json({ transactions });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return Response.json({ transactions: [], error: msg });
  }
}
