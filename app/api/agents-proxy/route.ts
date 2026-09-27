import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth/zp-session";

export async function GET(req: NextRequest) {
  // Platform-level data (ZeniPay's own Finix account) — operators only.
  const denied = await requireAdmin(req as NextRequest);
  if (denied) return denied;
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "";
  
  try {
    const res = await fetch(`https://www.zenivatravel.com/api/agents-proxy?path=${encodeURIComponent(path)}`, {
      headers: { "x-zenipay-key": process.env.ZENIPAY_CLIENT_KEY || "" }
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ bookings: [], agents: [] });
  }
}
