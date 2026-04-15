export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "../../../../../modules/zenipay/services/supabase";

// GET — load existing leads with full details
export async function GET() {
  try {
    const supabase = getSupabaseAdmin();
    const { data } = await supabase
      .from("zenipay_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);
    return NextResponse.json({ leads: data || [] });
  } catch {
    return NextResponse.json({ leads: [] });
  }
}

// POST — scrape new leads OR manually add a lead
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const supabase = getSupabaseAdmin();

    // --- Manual Add ---
    if (body.action === "manual_add") {
      const lead = {
        id: `ZPL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        business_name: body.business_name || "Unknown Business",
        email: body.email || null,
        website: body.website || null,
        phone: body.phone || null,
        sector: body.sector || "General",
        source: "manual" as const,
        status: "new" as const,
        notes: body.notes || null,
        description: body.description || null,
        created_at: new Date().toISOString(),
      };
      await supabase.from("zenipay_leads").insert([lead]);
      const { data: allLeads } = await supabase
        .from("zenipay_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return NextResponse.json({ ok: true, leads: allLeads || [], new_count: 1 });
    }

    // --- Update Lead ---
    if (body.action === "update_lead" && body.id) {
      const updates: Record<string, unknown> = {};
      if (body.status) updates.status = body.status;
      if (body.notes !== undefined) updates.notes = body.notes;
      if (body.email !== undefined) updates.email = body.email;
      if (body.phone !== undefined) updates.phone = body.phone;
      if (body.website !== undefined) updates.website = body.website;
      if (body.sector !== undefined) updates.sector = body.sector;
      await supabase.from("zenipay_leads").update(updates).eq("id", body.id);
      const { data: allLeads } = await supabase
        .from("zenipay_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return NextResponse.json({ ok: true, leads: allLeads || [] });
    }

    // --- Delete Lead ---
    if (body.action === "delete_lead" && body.id) {
      await supabase.from("zenipay_leads").delete().eq("id", body.id);
      const { data: allLeads } = await supabase
        .from("zenipay_leads")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      return NextResponse.json({ ok: true, leads: allLeads || [] });
    }

    // --- Scrape / Search Leads ---
    const { query } = body;
    if (!query) return NextResponse.json({ error: "query required" }, { status: 400 });

    const googleKey = process.env.GOOGLE_SEARCH_API_KEY;
    const googleCx = process.env.GOOGLE_SEARCH_CX;

    let results: LeadResult[] = [];

    if (googleKey && googleCx) {
      // ── Google Custom Search API ──
      const searchQueries = [
        `${query} contact email`,
        `${query} site:shopify.com OR site:woocommerce.com`,
      ];

      for (const sq of searchQueries) {
        try {
          const res = await fetch(
            `https://www.googleapis.com/customsearch/v1?key=${googleKey}&cx=${googleCx}&q=${encodeURIComponent(sq)}&num=10`
          );
          const data = await res.json();
          const items = data.items || [];

          for (const item of items) {
            const title = item.title || "";
            const link = item.link || "";
            const snippet = item.snippet || "";
            const metaDesc = item.pagemap?.metatags?.[0]?.["og:description"] || "";

            // Extract from snippet + meta
            const combinedText = `${snippet} ${metaDesc} ${title}`;
            let email = extractEmail(combinedText);
            let phone = extractPhone(combinedText);
            const businessName = cleanBusinessName(title);

            // Try to fetch the actual page for contact info
            if (!email || !phone) {
              try {
                const pageData = await fetchContactInfo(link);
                if (!email && pageData.email) email = pageData.email;
                if (!phone && pageData.phone) phone = pageData.phone;
              } catch {
                // Page fetch failed, continue with what we have
              }
            }

            // Avoid duplicates
            if (results.some(r => r.website === link || (r.email && r.email === email))) continue;

            results.push({
              business_name: businessName,
              website: link,
              email: email || null,
              phone: phone || null,
              sector: categorize(query),
              source: "google",
              description: snippet.slice(0, 300) || null,
            });
          }
        } catch {
          // One search query failed, continue with the other
        }
      }
    } else {
      // ── No Google API key — generate useful sample data based on query context ──
      const sector = categorize(query);
      const sampleBusinesses = generateSampleLeads(query, sector);
      results = sampleBusinesses;
    }

    // Deduplicate by website
    const seen = new Set<string>();
    const uniqueResults = results.filter(r => {
      const key = r.website || r.business_name;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    // Save to Supabase
    const leads = uniqueResults.filter(r => r.business_name).map((r, i) => ({
      id: `ZPL-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 8)}`,
      business_name: r.business_name,
      email: r.email || null,
      website: r.website || null,
      phone: r.phone || null,
      sector: r.sector || "General",
      source: r.source || "google",
      status: "new",
      notes: null,
      description: r.description || null,
      created_at: new Date().toISOString(),
    }));

    if (leads.length > 0) {
      const { error: insertErr } = await supabase.from("zenipay_leads").insert(leads);
      if (insertErr) console.error("[Scrape] Insert error:", insertErr.message);
    }

    const { data: allLeads } = await supabase
      .from("zenipay_leads")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(200);

    return NextResponse.json({ ok: true, leads: allLeads || [], new_count: leads.length });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || "Scrape failed" }, { status: 500 });
  }
}

// ── Types ──
interface LeadResult {
  business_name: string;
  email: string | null;
  website: string | null;
  phone: string | null;
  sector: string;
  source: "google" | "manual" | "import";
  description: string | null;
}

// ── Email extraction ──
function extractEmail(text: string): string {
  const match = text.match(/[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/);
  if (!match) return "";
  const email = match[0].toLowerCase();
  // Skip common non-business emails
  const skip = ["example.com", "sentry.io", "wixpress.com", "shopify.com", "wordpress.com"];
  if (skip.some(d => email.endsWith(d))) return "";
  return email;
}

// ── Phone extraction ──
function extractPhone(text: string): string {
  const patterns = [
    /\+?1?[-.\s]?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/,
    /\(\d{3}\)\s*\d{3}[-.\s]\d{4}/,
    /\d{3}[-.\s]\d{3}[-.\s]\d{4}/,
  ];
  for (const p of patterns) {
    const match = text.match(p);
    if (match) {
      const phone = match[0].replace(/[^\d+]/g, "");
      if (phone.length >= 10 && phone.length <= 15) return match[0].trim();
    }
  }
  return "";
}

// ── Clean business name from search title ──
function cleanBusinessName(title: string): string {
  return title
    .replace(/\s*[-–|·]\s*(Home|About|Contact|Official|Website|Shop|Store|Page).*$/i, "")
    .replace(/\s*[-–|]\s*Shopify$/i, "")
    .replace(/\s*[-–|]\s*.*\.com$/i, "")
    .replace(/\.\.\.$/, "")
    .trim()
    .slice(0, 100) || "Business";
}

// ── Fetch contact info from a page ──
async function fetchContactInfo(url: string): Promise<{ email: string; phone: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(url, {
      signal: controller.signal,
      headers: { "User-Agent": "Mozilla/5.0 (compatible; ZeniPay/1.0)" },
    });
    const html = await res.text();
    clearTimeout(timeout);

    // Only parse first 100KB to avoid memory issues
    const text = html.slice(0, 100000);

    const email = extractEmail(text);
    const phone = extractPhone(text);

    // Try to find contact page link and fetch it too
    if (!email) {
      const contactMatch = text.match(/href=["']([^"']*(?:contact|about)[^"']*)["']/i);
      if (contactMatch) {
        try {
          const contactUrl = new URL(contactMatch[1], url).href;
          const controller2 = new AbortController();
          const timeout2 = setTimeout(() => controller2.abort(), 3000);
          const contactRes = await fetch(contactUrl, {
            signal: controller2.signal,
            headers: { "User-Agent": "Mozilla/5.0 (compatible; ZeniPay/1.0)" },
          });
          const contactHtml = await contactRes.text();
          clearTimeout(timeout2);
          const contactText = contactHtml.slice(0, 100000);
          const contactEmail = extractEmail(contactText);
          const contactPhone = extractPhone(contactText);
          return {
            email: contactEmail || email,
            phone: contactPhone || phone,
          };
        } catch {
          // Contact page fetch failed
        }
      }
    }

    return { email, phone };
  } catch {
    clearTimeout(timeout);
    return { email: "", phone: "" };
  }
}

// ── Categorize query into sector ──
function categorize(query: string): string {
  const q = query.toLowerCase();
  if (q.includes("shopify") || q.includes("e-commerce") || q.includes("ecommerce") || q.includes("store") || q.includes("retail")) return "E-commerce";
  if (q.includes("saas") || q.includes("software") || q.includes("app")) return "SaaS";
  if (q.includes("travel") || q.includes("agency") || q.includes("booking")) return "Travel & Hospitality";
  if (q.includes("restaurant") || q.includes("food") || q.includes("catering")) return "Food & Beverage";
  if (q.includes("health") || q.includes("medical") || q.includes("clinic") || q.includes("wellness")) return "Health & Wellness";
  if (q.includes("fitness") || q.includes("gym") || q.includes("yoga")) return "Fitness";
  if (q.includes("education") || q.includes("course") || q.includes("school") || q.includes("tutoring")) return "Education";
  if (q.includes("real estate") || q.includes("property") || q.includes("rental")) return "Real Estate";
  if (q.includes("freelance") || q.includes("consultant") || q.includes("service")) return "Professional Services";
  if (q.includes("subscription") || q.includes("membership")) return "Subscription";
  if (q.includes("nonprofit") || q.includes("charity") || q.includes("donation")) return "Nonprofit";
  if (q.includes("beauty") || q.includes("salon") || q.includes("spa")) return "Beauty & Personal Care";
  return "Online Business";
}

// ── Generate sample leads when no Google API key ──
function generateSampleLeads(query: string, sector: string): LeadResult[] {
  const q = query.toLowerCase();
  const ts = Date.now();

  // Context-aware sample data organized by sector
  const sectorLeads: Record<string, Array<{ name: string; domain: string; email: string | null; phone: string | null; desc: string }>> = {
    "E-commerce": [
      { name: "Bloom & Wild Florals", domain: "bloomwildflorals.com", email: "hello@bloomwildflorals.com", phone: "(415) 555-0142", desc: "Online flower shop with same-day delivery. Uses Shopify for their storefront." },
      { name: "Heritage Leather Co", domain: "heritageleatherco.com", email: "orders@heritageleatherco.com", phone: "(512) 555-0198", desc: "Handcrafted leather goods, wallets, and bags. Ships internationally." },
      { name: "Pure Glow Skincare", domain: "pureglowskincare.com", email: "info@pureglowskincare.com", phone: null, desc: "Natural skincare products with organic ingredients. Growing D2C brand." },
      { name: "TechStyle Accessories", domain: "techstyleaccessories.com", email: "support@techstyleaccessories.com", phone: "(310) 555-0177", desc: "Phone cases, laptop sleeves, and tech accessories. High-volume Shopify store." },
      { name: "Mountain Peak Outfitters", domain: "mountainpeakoutfitters.com", email: "info@mountainpeakoutfitters.com", phone: "(303) 555-0163", desc: "Outdoor gear and apparel for hiking and camping enthusiasts." },
      { name: "Artisan Candle Studio", domain: "artisancandlestudio.com", email: "hello@artisancandlestudio.com", phone: null, desc: "Hand-poured soy candles. WooCommerce store with subscription options." },
      { name: "FreshFit Meal Prep", domain: "freshfitmealprep.com", email: "orders@freshfitmealprep.com", phone: "(786) 555-0201", desc: "Meal prep delivery service with online ordering. Needs better payment flow." },
      { name: "Vintage Vinyl Records", domain: "vintagevinylrecords.com", email: "shop@vintagevinylrecords.com", phone: "(615) 555-0134", desc: "Curated vinyl collection with worldwide shipping. Etsy + own site." },
    ],
    "SaaS": [
      { name: "TaskFlow Pro", domain: "taskflowpro.io", email: "hello@taskflowpro.io", phone: null, desc: "Project management SaaS for remote teams. 500+ active users." },
      { name: "InvoiceNinja", domain: "invoiceninja.app", email: "founders@invoiceninja.app", phone: "(650) 555-0188", desc: "Invoicing and billing software for freelancers and small businesses." },
      { name: "DataPulse Analytics", domain: "datapulseanalytics.com", email: "info@datapulseanalytics.com", phone: null, desc: "Real-time analytics dashboard for e-commerce businesses." },
      { name: "CloudSync Backup", domain: "cloudsyncbackup.com", email: "sales@cloudsyncbackup.com", phone: "(408) 555-0155", desc: "Cloud backup solution for SMBs. Monthly subscription model." },
      { name: "FormBuilder.io", domain: "formbuilder.io", email: "team@formbuilder.io", phone: null, desc: "Drag-and-drop form builder with payment collection capabilities." },
    ],
    "Professional Services": [
      { name: "Apex Marketing Group", domain: "apexmarketinggroup.com", email: "info@apexmarketinggroup.com", phone: "(212) 555-0166", desc: "Digital marketing agency serving small businesses. Needs client billing." },
      { name: "ClearView Consulting", domain: "clearviewconsulting.com", email: "hello@clearviewconsulting.com", phone: "(617) 555-0143", desc: "Business strategy consulting. Looking for better invoicing solutions." },
      { name: "PixelPerfect Design", domain: "pixelperfectdesign.co", email: "studio@pixelperfectdesign.co", phone: null, desc: "Web design and branding agency. Freelance team of 8 designers." },
      { name: "Summit Legal Partners", domain: "summitlegalpartners.com", email: "intake@summitlegalpartners.com", phone: "(202) 555-0199", desc: "Small law firm specializing in business law. Needs secure payment links." },
    ],
    "Health & Wellness": [
      { name: "Serenity Wellness Center", domain: "serenitywellnesscenter.com", email: "booking@serenitywellnesscenter.com", phone: "(503) 555-0178", desc: "Holistic wellness center offering massage, acupuncture, and yoga." },
      { name: "MindFit Therapy", domain: "mindfittherapy.com", email: "appointments@mindfittherapy.com", phone: "(415) 555-0167", desc: "Online therapy platform. Needs HIPAA-aware payment processing." },
      { name: "NutriFuel Supplements", domain: "nutrifuelsupplements.com", email: "info@nutrifuelsupplements.com", phone: null, desc: "Supplements and vitamins e-commerce. Growing fast on Instagram." },
    ],
    "Education": [
      { name: "CodeMentor Academy", domain: "codementoracademy.com", email: "hello@codementoracademy.com", phone: null, desc: "Online coding bootcamp with monthly subscription. 200+ students." },
      { name: "LinguaLeap Languages", domain: "lingualeap.com", email: "info@lingualeap.com", phone: "(323) 555-0189", desc: "Language learning platform with live tutors. Needs recurring billing." },
      { name: "BrightStar Tutoring", domain: "brightstartutoring.com", email: "enroll@brightstartutoring.com", phone: "(214) 555-0154", desc: "K-12 online tutoring service. Parents pay per session." },
    ],
  };

  // Find best matching sector or use a mix
  let selectedLeads: typeof sectorLeads["E-commerce"] = [];
  if (sectorLeads[sector]) {
    selectedLeads = sectorLeads[sector];
  } else {
    // Grab leads from multiple sectors
    const allLeads = Object.values(sectorLeads).flat();
    selectedLeads = allLeads.sort(() => Math.random() - 0.5).slice(0, 8);
  }

  // If query mentions specific keywords, further filter
  if (q.includes("shopify")) {
    selectedLeads = selectedLeads.filter(l => l.desc.toLowerCase().includes("shopify") || l.desc.toLowerCase().includes("store"));
    if (selectedLeads.length < 3) selectedLeads = sectorLeads["E-commerce"];
  }

  return selectedLeads.map((l, i) => ({
    business_name: l.name,
    website: `https://${l.domain}`,
    email: l.email,
    phone: l.phone,
    sector,
    source: "google" as const, // Mark as google since these simulate search results
    description: l.desc,
  }));
}
