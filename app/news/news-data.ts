// Newsroom — official ZeniPay announcements, published on ZeniPay's own domain.
// Each item renders as a NewsArticle authored by the founder (shared Person @id) and
// published by Zeniva Group, about the ZeniPay entity declared in app/layout.tsx.
//
// Positioning rule: ZeniPay is a "fintech platform" in every announcement. The word
// "bank" is restricted in Canada under the Bank Act — keep it out of press material.

export interface NewsItem {
  slug: string;
  title: string;
  summary: string;
  datePublished: string;
  dateline: string;
  aboutId: string;
  brand: string;
  paragraphs: string[];
  quote?: string;
  boilerplate: string;
  links: { label: string; href: string }[];
}

const ZENIPAY_BOILERPLATE =
  "ZeniPay Inc. is a Canadian fintech company founded in 2026 by Alexandre Blais, part of Zeniva Group. The platform combines payment acceptance, payouts, invoicing and accounting with a team of AI financial specialists for businesses and individuals in Canada and the United States. ZeniPay is not affiliated with ZenPay, Zen.com, Zenus Bank or Zenai Pay. zenipay.ca";

export const NEWS: NewsItem[] = [
  {
    slug: "zenipay-launches-fintech-platform-with-ai-financial-specialists",
    title: "ZeniPay launches a Canadian fintech platform with a built-in team of AI financial specialists",
    summary:
      "Payments, payouts, invoicing and accounting with a team of AI specialists — Leo, Ben, Atlas, Vera and Kai — that read live account data and answer in English or French. Built to run Zeniva Travel; available to other platforms under their own brand.",
    datePublished: "2026-09-22",
    dateline: "Québec City, QC",
    aboutId: "https://zenipay.ca/#organization",
    brand: "ZeniPay",
    paragraphs: [
      "ZeniPay Inc. today announced ZeniPay, a fintech platform for personal and business customers in Canada and the United States. Each account combines payments (card acceptance, ACH and wire), payouts, invoicing, payment links and accounting with a team of AI specialists — Leo (accounting), Ben (finance), Atlas (security), Vera (compliance) and Kai (revenue) — that read the account's live data and answer questions in plain English or French.",
      "ZeniPay was built to run Zeniva Travel, the group's AI travel agency. Its core is an append-only ledger with idempotency keys and a signed audit trail, and independent agents can be onboarded as sub-merchants. Automated commission splits and payouts are the next step; today the distribution is done manually, and the payment processor connections are completing their move from test to production. The same rails will be offered to other platforms, agencies and contractor networks under their own brand.",
      "The AI specialists are scoped to a single account. They read that account's own data through audited tool calls — never another tenant's — and the conversation persists, so a business does not re-explain itself at every login.",
      "ZeniPay is not affiliated with ZenPay, Zen.com, Zenus Bank or Zenai Pay.",
    ],
    quote:
      "Most platforms still split commissions in a spreadsheet at the end of the month. We started with the part that has to be right before anything else: a ledger nobody can rewrite. Then we gave every account an accountant, a security analyst and a compliance officer that never sleep.",
    boilerplate: ZENIPAY_BOILERPLATE,
    links: [
      { label: "ZeniPay platform", href: "/" },
      { label: "For platforms and marketplaces", href: "/merchant" },
      { label: "How commission splits work for travel agents and platforms", href: "/blog/how-commission-splits-work-travel-agents-platforms" },
      { label: "Alexandre Blais, founder", href: "/alexandre-blais" },
    ],
  },
  {
    slug: "alexandre-blais-unites-four-companies-under-zeniva-group",
    title: "Quebec entrepreneur Alexandre Blais unites four companies under Zeniva Group",
    summary:
      "Zeniva Group is the parent group for Zeniva Travel (AI travel agency, USA), ZeniPay (fintech, Canada & US), ZeniCorp (construction and renovation platform, Quebec) and ZeniTech (technology). One principle: build the technology for the group's own businesses first, then offer it to clients.",
    datePublished: "2026-09-22",
    dateline: "Québec City, QC",
    aboutId: "https://www.zeniva.ca/#group",
    brand: "Zeniva Group",
    paragraphs: [
      "Alexandre Blais today announced Zeniva Group, the parent group for four companies he founded and operates across Canada and the United States: Zeniva Travel, an AI-powered travel agency incorporated in Delaware; ZeniPay, a Canadian fintech platform; ZeniCorp, a construction and renovation platform in Quebec; and ZeniTech, the group's technology division.",
      "The four companies share one operating principle: build the technology first for the group's own businesses, then offer it to clients. ZeniPay is the clearest example — it was built to move money for Zeniva Travel and ZeniCorp before it was offered to anyone else.",
      "ZeniPay (zenipay.ca) serves Canada and the United States with personal and business accounts, card payment acceptance, payouts, invoicing, accounting, and a built-in team of AI financial specialists.",
    ],
    quote:
      "Every tool we sell has already run a real company with real customers. That is the whole idea. We are not an agency that builds demos — we are operators who happen to build the software.",
    boilerplate:
      "Alexandre Blais is a Quebec entrepreneur based between Québec City and the US East Coast. He founded Zeniva Travel in 2024 and has since launched ZeniPay, ZeniCorp and ZeniTech. Profile: zenivatravel.com/alexandre-blais.",
    links: [
      { label: "Zeniva Group — the four brands", href: "https://www.zeniva.ca/groupe" },
      { label: "Alexandre Blais, founder", href: "/alexandre-blais" },
      { label: "Zeniva Travel", href: "https://www.zenivatravel.com" },
    ],
  },
];

export function findNews(slug: string): NewsItem | null {
  return NEWS.find((n) => n.slug === slug) ?? null;
}
