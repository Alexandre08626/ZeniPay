export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../modules/zenipay/services/supabase";

// GET — load existing leads
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase.from("zenipay_leads").select("*").order("created_at", { ascending: false }).limit(100);
    return NextResponse.json({ leads: data || [] });
  } catch {
    return NextResponse.json({ leads: [] });
  }
}

// POST — scrape new leads via Google search
export async function POST(req: NextRequest) {
  try {
    const { query } = await req.json();
    if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

    const supabase = getSupabaseAdmin();

    // Use Google Custom Search API if available, otherwise simulate with curated results
    const googleKey = process.env.GOOGLE_SEARCH_API_KEY;
    const googleCx = process.env.GOOGLE_SEARCH_CX;

    let results: any[] = [];

    if (googleKey && googleCx) {
      const res = await fetch(`https://www.googleapis.com/customsearch/v1?key=${googleKey}&cx=${googleCx}&q=${encodeURIComponent(query + " contact email")}&num=10`);
      const data = await res.json();
      results = (data.items || []).map((item: any) => ({
        business_name: item.title?.replace(/ - .*$/, "").slice(0, 100) || "Business",
        website: item.link || "",
        email: extractEmail(item.snippet || "") || extractEmail(item.title || "") || "",
        sector: categorize(query),
        source: "google",
      }));
    } else {
      // Fallback: generate sample leads based on query (for demo/testing)
      const sectors = query.toLowerCase().includes("shopify") ? "E-commerce" : query.toLowerCase().includes("saas") ? "SaaS" : "Online Business";
      results = [
        { business_name: `${query} Lead 1`, website: `https://example-${Date.now()}.com`, email: "", sector: sectors, source: "manual" },
        { business_name: `${query} Lead 2`, website: `https://example-${Date.now()+1}.com`, email: "", sector: sectors, source: "manual" },
      ];
    }

    // Save to Supabase
    const leads = results.filter(r => r.business_name).map(r => ({
      business_name: r.business_name,
      email: r.email || null,
      website: r.website || null,
      sector: r.sector || "General",
      source: r.source || "scrape",
      status: "new",
      created_at: new Date().toISOString(),
    }));

    if (leads.length > 0) {
      await supabase.from("zenipay_leads").insert(leads);
    }

    // Return all leads (including newly scraped)
    const { data: allLeads } = await supabase.from("zenipay_leads").select("*").order("created_at", { ascending: false }).limit(100);

    return NextResponse.json({ ok: true, leads: allLeads || [], new_count: leads.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Scrape failed" }, { status: 500 });
  }
}

function extractEmail(text: string): string {
  const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  return match ? match[0] : "";
}

function categorize(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("shopify") || q.includes("e-commerce") || q.includes("store")) return "E-commerce";
  if (q.includes("saas") || q.includes("software")) return "SaaS";
  if (q.includes("travel") || q.includes("agency")) return "Travel";
  if (q.includes("restaurant") || q.includes("food")) return "Food & Beverage";
  return "Online Business";
}
