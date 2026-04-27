// Seed blog posts. Each post is a server-rendered MDX-equivalent —
// title + meta + content blocks. Adding a new post = append an entry
// here, rebuild, ship. Once volume justifies it we move to MDX or a
// CMS, but the file-based store keeps the seed phase fast.

export interface BlogPost {
  slug: string;
  title: string;
  description: string;
  date: string;          // ISO YYYY-MM-DD
  readingMinutes: number;
  language: "en" | "fr";
  tags: string[];
  /** First paragraph used for the index card + meta description fallback. */
  excerpt: string;
  /** Body rendered as a sequence of blocks. Each block is either a
   *  paragraph (plain string) or a sub-heading (`{ h: "..." }`). */
  body: Array<string | { h: string }>;
}

export const POSTS: BlogPost[] = [
  {
    slug: "what-is-ai-banking",
    title: "What is AI banking? Everything you need to know in 2026.",
    description:
      "AI banking means having a fleet of specialized AI agents inside your bank account, reading your real data and answering in plain language. Here's what that actually looks like in 2026, why it matters more than chatbots, and how ZeniPay built the first one for Canadian and American customers.",
    date: "2026-04-27",
    readingMinutes: 6,
    language: "en",
    tags: ["AI banking", "neobank", "fintech Canada", "AI agents"],
    excerpt:
      "Most people hear \"AI banking\" and picture a chatbot stapled onto online banking. That's not it. Real AI banking is a fleet of specialized agents that read your live account data and answer in plain language — accountant, security, compliance, finance, revenue. ZeniPay built the first one.",
    body: [
      "Most people hear \"AI banking\" and picture a chatbot stapled onto online banking. That's not it. Real AI banking is a fleet of specialized agents that read your live account data — your accounts, your ledger, your invoices, your payouts — and answer your questions in plain language. They're not generic. They have specialties: accountant, finance, security, compliance, revenue.",
      { h: "The 2026 reality: chatbot ≠ AI banking" },
      "A chatbot scripted to recite your FAQ is not AI banking. Neither is a model that summarizes your last three transactions in a sidebar. AI banking, properly built, has three load-bearing properties:",
      "1. The agents read your real account data via tool calls — not from a screenshot, not from cached summaries, but live, on every question. Ask Ben \"what's my MTD net cashflow?\" and he calls a tool that pulls from the ledger right now.",
      "2. The agents are specialized. Generic models are bad accountants. A real AI accountant has a system prompt that frames bookkeeping at personal or business scale, names the GL accounts, and refuses to invent figures. ZeniPay's Leo, Ben, Atlas, Vera, and Kai are five separate specialists, not one model with five hats.",
      "3. The conversation persists. You don't re-explain your business every time you log in. Your AI accountant remembers the last close, last quarter's anomalies, the deductions you flagged. Persistence is what turns a one-shot Q&A into an actual relationship.",
      { h: "What problems AI banking actually solves" },
      "Banking is the most paperwork-heavy product most people use. Customers spend hours per month searching FAQs, emailing accountants, exporting CSVs into Excel, waiting on hold. AI banking compresses each of those into a sentence:",
      "\"Categorize last month's spend\" — Leo classifies and posts to the right GL accounts. \"Is this charge suspicious?\" — Atlas pulls the merchant, the time-of-day, your baseline, and tells you. \"Am I FINTRAC-compliant on this transfer?\" — Vera reads the rule, applies your jurisdiction, and answers.",
      "Compare that to: open four tabs, copy-paste, search a help center, draft an email. AI banking moves you from minutes-to-hours per question down to seconds.",
      { h: "What separates ZeniPay from \"AI features\" bolted onto traditional banks" },
      "Most legacy banks bolted on a single chat surface late in 2025. The architecture below the chat is still ten-year-old core banking. The chat can't see your real data without a human ticket; it certainly can't read across accounts, ledger, and invoices in one query.",
      "ZeniPay was built the other way around. Every account ships with the fleet on day one. The agents read live data through scoped, audited tool calls. The signed audit trail, the SOC 2-grade controls, and the FINTRAC / FinCEN posture are infrastructure — not features added later.",
      { h: "How many agents per account, and what they cost" },
      "Personal accounts ship with 5 agents at no extra cost: Leo (accountant), Ben (finance), Atlas (security), Vera (compliance), Kai (revenue). Business accounts can scale up to 9 specialists, including Marco (lead hunter), Sofia (email marketing), Mia (social media), Rex (platform engineer), Kai (revenue intelligence).",
      "The bank itself is free to open. Personal accounts have no monthly fee. Business accounts pay only per transaction (cards 2.7% + 30¢, ACH 0.8%) — the AI fleet is included.",
      { h: "Where AI banking is going" },
      "Two patterns are clear in 2026. First, agents will get more autonomous: not just answering questions but proposing actions (\"close the books for March\", \"raise this fraud alert\"), pending your approval. Second, the bank itself will be the AI's data source — not a third-party export. The companies that win are the ones who own both layers, the way ZeniPay does.",
      "The migration from \"online banking + chatbot\" to \"AI banking native\" is the same shift we saw from \"shopping on the web\" to \"shopping in apps.\" It looks incremental until it isn't.",
      { h: "Try it" },
      "Open a free personal account at zenipay.ca/register?type=personal. Two-step signup, under two minutes. The five agents are waiting.",
    ],
  },
  {
    slug: "agent-ia-financier-pme-canada",
    title: "Pourquoi chaque PME canadienne a besoin d'un agent IA financier en 2026.",
    description:
      "Un agent IA financier lit vos vraies données bancaires en temps réel et répond en français clair. Voici ce que ça change concrètement pour une PME québécoise — la fin du va-et-vient avec le comptable, des réponses immédiates sur la paie, la TPS/TVQ, le cashflow.",
    date: "2026-04-27",
    readingMinutes: 5,
    language: "fr",
    tags: ["banque IA", "néobanque Québec", "agent IA financier", "PME Canada"],
    excerpt:
      "Le comptable répond aux courriels une fois par semaine. Le directeur de banque rappelle dans 48 h. Pendant ce temps, vous décidez sans donnée. Un agent IA financier change l'équation : il lit votre compte en direct et répond en français, en temps réel.",
    body: [
      "Le comptable répond aux courriels une fois par semaine. Le directeur de banque rappelle dans 48 h. Pendant ce temps, vous décidez sans donnée — sur la paie, sur les acomptes provisionnels, sur le cashflow du trimestre. Un agent IA financier change l'équation : il lit votre compte en direct, comprend le contexte québécois (TPS, TVQ, FINTRAC, RQ), et répond en français en temps réel.",
      { h: "Ce que fait concrètement un agent IA financier" },
      "Sur ZeniPay, chaque compte d'entreprise est livré avec une équipe d'agents spécialisés : Leo (comptable), Ben (finances), Atlas (sécurité), Vera (conformité), Kai (revenus). Chacun a son domaine et lit vos vraies données via des appels d'outils sécurisés — il n'invente jamais un chiffre.",
      "Demandez à Leo \"classe les dépenses de mars dans le bon compte GL\" et c'est fait, en plain text, prêt à exporter vers QuickBooks ou Xero. Demandez à Ben \"quel est mon flux de trésorerie net YTD?\" et il pige le ledger en direct, applique le filtre, vous donne le chiffre avec la fenêtre temporelle citée.",
      { h: "Le contexte québécois, sans traduction" },
      "La majorité des outils financiers IA ont été construits en anglais et adaptés en français comme un sous-titre. ZeniPay détecte la langue de votre premier message et reste dans cette langue — vraiment. La conformité aussi : FINTRAC pour le Canada, RQ pour le Québec, citée correctement quand c'est pertinent.",
      "Pour une PME québécoise, ça veut dire : pas de traduction approximative de \"sales tax\" en \"taxe de vente\" quand on parle de TPS et TVQ. Vera connaît la différence et nomme la bonne taxe.",
      { h: "Les trois questions qui justifient l'investissement" },
      "Trois questions qu'une PME se pose chaque mois et que l'agent IA répond en moins d'une minute :",
      "1. \"Combien j'ai dépensé en marketing ce mois-ci ? Comparé au trimestre précédent ?\" Leo lit le ledger, filtre par catégorie GL, retourne les deux chiffres.",
      "2. \"Cette transaction de 4 200 $ vers un nouveau fournisseur, est-ce que ça déclenche une obligation FINTRAC ?\" Vera vérifie le seuil, le type de paiement, et répond.",
      "3. \"Si je paie la TVQ aujourd'hui, est-ce que je passe sous le seuil de cashflow critique pour la paie du 15 ?\" Ben fait l'arithmétique sur vos vraies données.",
      "Sans agent IA, ces trois questions = trois courriels au comptable + un appel au directeur de banque + 24 à 72 heures d'attente. Avec l'agent : moins de cinq minutes.",
      { h: "Pourquoi pas un GPT générique ?" },
      "Un GPT générique ne voit pas votre compte. Vous devez copier-coller des chiffres, anonymiser, expliquer le contexte fiscal. Le résultat est généralement faux ou \"je ne peux pas répondre sans plus de contexte\".",
      "Un agent IA bancaire bien construit a trois propriétés un GPT n'a pas : (1) l'accès direct à vos données via outils sécurisés, (2) un prompt système spécialisé pour son rôle, (3) une mémoire persistante de la conversation. ZeniPay a les trois par défaut, sur chaque compte.",
      { h: "Le coût" },
      "Compte d'entreprise ZeniPay : gratuit à ouvrir, vous payez seulement par transaction (cartes 2,7 % + 30 ¢, ACH 0,8 %). Les 9 agents sont inclus, sans frais mensuel, sans contrat.",
      "Comparé aux 200-500 $ par mois pour une suite logicielle qui n'inclut ni un compte bancaire réel ni un agent IA réel, c'est un changement de catégorie.",
      { h: "Comment commencer" },
      "Ouvrez un compte d'entreprise sur zenipay.ca/register. L'onboarding prend trois étapes (compte, KYB, identité) et vos agents sont actifs dès la première connexion. Bilingue par défaut.",
    ],
  },
  {
    slug: "zenipay-vs-stripe-vs-wise-canada",
    title: "ZeniPay vs Stripe vs Wise: which one is right for Canadian businesses?",
    description:
      "Stripe is a payment processor. Wise is a money-transfer service. ZeniPay is an actual online bank with built-in AI agents. Here's a side-by-side breakdown of fees, features, AI capabilities, and which one fits your business in Canada or the US.",
    date: "2026-04-27",
    readingMinutes: 7,
    language: "en",
    tags: ["Stripe alternative Canada", "online bank Canada", "Wise alternative", "fintech comparison"],
    excerpt:
      "Three brands keep coming up in Canadian business banking conversations: Stripe, Wise, and now ZeniPay. They're not the same product. Stripe processes payments. Wise moves money internationally. ZeniPay is an actual online bank with AI specialists built in.",
    body: [
      "Three brands keep coming up in Canadian business banking conversations: Stripe, Wise, and now ZeniPay. People ask which one to pick. The honest answer: they're not the same product. Picking between them is like asking whether to use a wrench, a screwdriver, or a fully equipped workshop. Here's the actual breakdown.",
      { h: "What each one is, in one sentence" },
      "Stripe is a payment processor. You plug it into your website, it accepts cards and ACH, deposits to your existing bank account a few business days later. Stripe doesn't hold your money long-term — it's a pipeline.",
      "Wise (formerly TransferWise) is a money-transfer and multi-currency wallet service. It's optimized for paying international invoices at the real mid-market FX rate. You can hold balances in 50+ currencies, but it's not your primary operating bank.",
      "ZeniPay is an actual online bank. You open a real account with a routing number, hold balances in CAD and USD, send and receive ACH and wire, accept card payments, send instant payouts (RTP / FedNow), and access a built-in fleet of AI specialists who read your live data. It's the operating account, not a pipeline.",
      { h: "Side-by-side: features that matter to Canadian businesses" },
      "Real account with routing number — Stripe: no. Wise: account-like (multi-currency wallets). ZeniPay: yes (CAD + USD).",
      "Card payments (cards 2.7% + 30¢ on ZeniPay, similar on Stripe) — Stripe: yes. Wise: no. ZeniPay: yes.",
      "Instant payouts (RTP / FedNow) — Stripe: extra fee. Wise: international focus. ZeniPay: included.",
      "Invoicing — Stripe: yes (extra fee at scale). Wise: limited. ZeniPay: yes (no extra fee).",
      "Multi-currency wallets — Stripe: limited. Wise: yes (50+ currencies). ZeniPay: CAD + USD core, 135+ for processing.",
      "AI agents reading live account data — Stripe: no. Wise: no. ZeniPay: yes (5 personal, up to 9 business).",
      "Bilingual EN/FR interface — Stripe: partial. Wise: partial. ZeniPay: native.",
      "FINTRAC / FinCEN compliance built in — Stripe: yes. Wise: yes. ZeniPay: yes.",
      { h: "When Stripe is the right pick" },
      "If you have an existing bank account you trust, you only need to accept card payments online, and you don't need invoicing, payouts, or banking surface — Stripe is fine. It's a payment processor and a great one.",
      "It becomes painful when: you start needing real payouts to staff or contractors (extra cost), you need invoicing at scale (extra cost), you want a single source of truth for your finances (you have to glue Stripe to your bank manually).",
      { h: "When Wise is the right pick" },
      "If your business is heavy on international invoices — paying suppliers in EUR, GBP, AUD, etc. — Wise's multi-currency wallets at mid-market FX is the cleanest tool. You'll still need a primary bank account separately.",
      "It becomes painful when: you want to hold a real CAD operating account, accept card payments natively, or run a single dashboard for your money.",
      { h: "When ZeniPay is the right pick" },
      "If you want one account that's your primary bank, your payment processor, your invoicing tool, AND ships with AI specialists who read your data — ZeniPay is built for that. The whole stack is unified, the AI is included, and it's bilingual by default.",
      "It's the strongest pick for Canadian businesses that don't want to glue together three SaaS products with manual exports between them. The AI fleet is the differentiator: Leo handles your books, Ben tracks cashflow, Vera fields compliance questions, Atlas watches security. None of those exist on Stripe or Wise.",
      { h: "The fee comparison, honestly" },
      "ZeniPay: free to open, no monthly fee. Cards 2.7% + 30¢, ACH 0.8%. AI agents included.",
      "Stripe: free to open, no monthly fee. Cards 2.9% + 30¢ in Canada. Add-ons (invoicing at volume, instant payouts) charged separately.",
      "Wise: free account, transfers cost the mid-market FX rate plus a small fixed fee. Card acceptance not core to the product.",
      "On pure card processing alone, ZeniPay is slightly cheaper than Stripe in Canada. The bigger gap is what's included: AI agents, invoicing, payouts, banking surface.",
      { h: "The verdict" },
      "Use Stripe if you only need to accept card payments and you already have a bank you love.",
      "Use Wise if you live in international invoices.",
      "Use ZeniPay if you want your operating account, payments, payouts, and AI specialists to be one product. Most Canadian SMBs in 2026 are in this third bucket.",
      "Open a ZeniPay business account at zenipay.ca/register. Three steps. Routing number, both Test and Live API keys, and your AI fleet, ready before the end of the day.",
    ],
  },
];

export function findPost(slug: string): BlogPost | null {
  return POSTS.find((p) => p.slug === slug) ?? null;
}
