import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const path = searchParams.get("path") || "";
  
  try {
    const res = await fetch(`https://www.zenivatravel.com/api/agents-proxy?path=${path}`, {
      headers: { "x-zenipay-key": process.env.ZENIPAY_CLIENT_KEY || "" }
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ bookings: [], agents: [] });
  }
}
