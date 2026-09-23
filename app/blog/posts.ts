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
  {
    slug: "how-commission-splits-work-travel-agents-platforms",
    title: "How commission splits work for travel agents and platforms — with a real example.",
    description:
      "A plain-language walkthrough of how a travel booking turns into commission, how a platform splits net profit with an independent agent (Zeniva's public 70/30 model), what \"net\" actually means, and how ZeniPay automates the split, the payout and the accounting.",
    date: "2026-09-21",
    readingMinutes: 6,
    language: "en",
    tags: ["commission splits", "travel agent commission", "payouts platform", "sub-merchant onboarding", "fintech for travel"],
    excerpt:
      "Most travel agents can tell you their split. Very few can tell you exactly how the number on their payout was computed — gross vs. net, supplier cost, processing fees, timing. Here is the full arithmetic on one real-size booking, and how a platform automates it.",
    body: [
      "Most travel agents can tell you their split — \"I'm on 70%.\" Very few can tell you exactly how the number on their payout was computed: gross or net, before or after supplier cost, before or after card fees, paid when. That ambiguity is where most agent–agency disputes come from. Here is the full arithmetic on one real-size booking, then how a platform automates it so nobody has to argue.",
      { h: "Gross booking, supplier cost, net profit" },
      "A client books a 7-night all-inclusive for a family of four. The gross booking is $7,677. The supplier — the resort, the consolidator, the tour operator — is owed $5,078 for the rooms, flights and transfers. The difference, $2,599, is the net profit on the booking. That is the number a split applies to. Not the $7,677.",
      "This is the first thing to check in any agent agreement: is the split on gross revenue or on net profit? A \"50% of gross\" deal and a \"70% of net\" deal can pay the agent almost the same amount, or wildly different amounts, depending on supplier margins.",
      { h: "Applying the split: Zeniva's public 70/30 model" },
      "Zeniva Travel publishes its model: an independent agent working with Lina, Zeniva's AI concierge, keeps 70% of net profit on their bookings; Zeniva keeps 30% and provides the technology, the AI, the supplier contracts and the payment infrastructure. On the booking above: agent share $1,819.30, platform share $779.70.",
      "If an influencer or referral partner brought the client, Zeniva's model moves 5 points from the platform side to the referrer — the agent's 70% is untouched. Bookings the platform closes directly, or through its AI alone, follow different splits. The principle is the same: the split is a rule applied to net profit, published in advance, not negotiated after the fact.",
      { h: "What \"net\" has to include" },
      "Net profit should be computed after the supplier cost and after payment processing fees, because those fees are real money that leaves before anyone is paid. On a $7,677 card payment, processing at 2.7% + 30¢ is roughly $207.58. Whether that fee is deducted before the split or absorbed by the platform must be written down. On ZeniPay it is a setting on the split rule, visible to both sides.",
      "Chargebacks and refunds follow the same logic: if a booking is refunded, the split reverses proportionally. A platform that cannot reverse a split automatically ends up chasing agents for money — which is how relationships end.",
      { h: "How a platform automates this" },
      "Manually, this is a spreadsheet, a monthly reconciliation and a batch of e-transfers. Automated, it is four steps that happen at payment time:",
      "1. The client pays the platform (card, ACH or payment link). The platform is the merchant of record.",
      "2. The platform records the supplier cost against the booking and computes net profit.",
      "3. The split rule fires: agent 70%, platform 30%, referrer 5 points if tagged. Each party's share is posted to their own wallet or sub-merchant account, with the booking ID, so every dollar is traceable.",
      "4. Payouts run on the schedule each party chose — instant, daily or weekly — and the ledger entries flow to accounting (QuickBooks, Xero, Wave or FreshBooks) without re-keying.",
      "This is what ZeniPay is built for: sub-merchant onboarding for agents, split rules on net profit, automatic payouts, and an audit trail per booking. Zeniva Travel runs on it; other platforms with agents, contractors or partners can run on the same rails under their own brand.",
      { h: "The five questions to ask before signing any split" },
      "Is the split on gross or on net? Who absorbs processing fees? When is the payout — at booking, at travel date, or on a monthly cycle? What happens on a refund or chargeback? Can I see the computation for every booking, not just the total?",
      "If the answer to the last one is \"trust us,\" the platform is not ready for agents.",
      { h: "For platforms" },
      "If you run a marketplace, an agency network or a contractor network and you are still splitting commissions in a spreadsheet, see zenipay.ca/merchant. Splits on net profit, payouts and accounting are one configuration, not a monthly project.",
    ],
  },
  {
    slug: "frais-traitement-carte-credit-pme-quebec",
    title: "Frais de carte de crédit pour une PME au Québec : ce que vous payez vraiment en 2026.",
    description:
      "Interchange, frais de réseau, marge du processeur : d'où viennent réellement les 2 à 3 % que vous payez sur chaque vente par carte, ce que la réduction fédérale de 2024 a changé pour les petites entreprises québécoises, et les quatre lignes à vérifier sur votre relevé de marchand.",
    date: "2026-09-22",
    readingMinutes: 7,
    language: "fr",
    tags: ["frais carte de crédit PME", "interchange Canada", "traitement de paiement Québec", "frais marchand", "ZeniPay"],
    excerpt:
      "Sur une vente de 100 $ par carte de crédit, une PME québécoise garde généralement entre 97 $ et 98 $. La différence n'est pas une seule commission : c'est un empilement de trois couches, dont une seule est négociable. Voici laquelle.",
    body: [
      "Sur une vente de 100 $ par carte de crédit, une PME québécoise garde généralement entre 97 $ et 98 $. La plupart des propriétaires savent ça. Beaucoup moins savent que ce 2 à 3 % n'est pas une commission, mais un empilement de trois couches distinctes — et qu'une seule des trois est réellement négociable.",
      { h: "Les trois couches de vos frais" },
      "Couche 1 — l'interchange. C'est la part qui va à la banque qui a émis la carte de votre client. Au Canada, elle se situe généralement entre 1,5 % et 2,5 % selon le type de carte, et grimpe au-delà pour les cartes à récompenses premium et les cartes corporatives. Vous ne la négociez pas : elle est fixée par Visa et Mastercard.",
      "Couche 2 — les frais de réseau. La part de Visa ou Mastercard eux-mêmes. Quelques dixièmes de pourcent, plus des frais fixes par transaction. Non négociable non plus.",
      "Couche 3 — la marge du processeur. C'est ce que garde l'entreprise qui traite vos paiements. C'est la seule couche sur laquelle vous avez du pouvoir — et c'est celle que les tarifs « tout inclus » vous empêchent de voir.",
      { h: "La réduction fédérale de 2024 : est-ce que vous en profitez ?" },
      "Depuis le 19 octobre 2024, les ententes conclues par le gouvernement fédéral ont réduit les taux d'interchange pour les petites entreprises : le taux moyen pondéré annuel pour les transactions de consommateurs en magasin est descendu autour de 0,95 %.",
      "Le piège est dans les seuils. Pour être admissible, il faut un volume annuel de ventes Visa inférieur à 300 000 $, ou un volume annuel Mastercard inférieur à 175 000 $. Beaucoup de PME québécoises sont admissibles et ne le savent pas, parce que l'admissibilité n'est pas toujours appliquée automatiquement par le processeur.",
      "Première action concrète : sortez votre relevé de marchand du mois dernier et cherchez si vos transactions sont facturées au taux réduit pour petite entreprise. Si vous êtes sous les seuils et que le taux n'y est pas, appelez votre processeur.",
      { h: "Tarif forfaitaire ou interchange-plus : lequel vous coûte le plus cher" },
      "Le tarif forfaitaire — un seul pourcentage pour toutes les cartes, par exemple 2,7 % + 30 ¢ — est simple à comprendre et prévisible. Il vous coûte plus cher quand vos clients paient surtout avec des cartes de débit ou des cartes de crédit de base, parce que vous payez le même taux que pour une carte premium.",
      "L'interchange-plus sépare les trois couches : vous payez l'interchange réel, plus les frais de réseau réels, plus une marge fixe annoncée. C'est moins prévisible d'un mois à l'autre, mais c'est le seul modèle qui vous montre ce que garde votre processeur. Pour une entreprise qui traite plus de 15 000 $ à 20 000 $ par mois, la transparence finit presque toujours par payer.",
      { h: "Les quatre lignes à vérifier sur votre relevé" },
      "1. Le taux effectif réel. Divisez le total des frais du mois par le total des ventes traitées. C'est votre vrai coût, tous frais confondus. Si ce chiffre dépasse 3 % et que vous vendez surtout en personne, il y a un problème.",
      "2. Les frais mensuels fixes. Frais de terminal, frais de relevé papier, frais de conformité PCI, frais de compte inactif. Additionnés, ils représentent souvent 30 $ à 80 $ par mois qui ne dépendent d'aucune vente.",
      "3. Les frais de rétrofacturation. Le montant par contestation, et surtout s'il vous est facturé même quand la contestation est tranchée en votre faveur.",
      "4. La durée du contrat et les frais de résiliation. Les contrats de 36 à 48 mois avec pénalité de résiliation sont encore courants au Québec. C'est la clause qui transforme un mauvais taux en mauvais taux pour quatre ans.",
      { h: "Ce que ça donne concrètement" },
      "Une PME québécoise qui traite 40 000 $ par mois à un taux effectif de 3,1 % paie 1 240 $ de frais mensuels. La même entreprise à 2,6 % paie 1 040 $. L'écart — 200 $ par mois, 2 400 $ par année — ne vient pas d'une négociation héroïque : il vient généralement d'un taux petite entreprise non appliqué, de frais fixes qu'on ne remarque plus, et d'un modèle de tarification mal choisi.",
      { h: "Chez ZeniPay" },
      "Nos tarifs sont publiés : cartes à 2,7 % + 30 ¢, ACH à 0,8 %, aucuns frais mensuels, aucun contrat à durée déterminée. Les comptes se créent en ligne, en français, pour les entreprises canadiennes et américaines.",
      "Et parce que la facturation, les paiements sortants et la comptabilité sont dans la même plateforme, le taux effectif dont on parle plus haut est visible en tout temps dans vos analyses — pas seulement quand vous ouvrez un relevé PDF à la fin du mois.",
      "Sources : Conseil canadien du commerce de détail, ministère des Finances du Canada (réduction des frais de carte de crédit, octobre 2024), Mastercard Canada (détails des taux d'interchange), BDC.",
    ],
  },
  {
    slug: "payer-sous-traitants-partenaires-automatiquement-quebec",
    title: "Payer ses sous-traitants et partenaires automatiquement : le guide pour une plateforme québécoise.",
    description:
      "Comment une plateforme, une agence ou un réseau d'entrepreneurs au Québec peut encaisser le client puis répartir et verser automatiquement la part de chaque partenaire — sur le profit net, avec une piste d'audit, sans tableur de fin de mois.",
    date: "2026-09-22",
    readingMinutes: 6,
    language: "fr",
    tags: ["payer sous-traitants", "répartition commissions", "paiements Québec", "plateforme marketplace", "ZeniPay"],
    excerpt:
      "Si vous encaissez un client puis reversez une part à un partenaire indépendant — agent, entrepreneur, créateur, franchisé — vous avez un problème de traçabilité avant d'avoir un problème d'addition. Voici comment l'automatiser.",
    body: [
      "Si vous encaissez un client puis reversez une part à un partenaire indépendant — un agent de voyage, un entrepreneur en construction, un créateur, un franchisé — vous avez un problème de traçabilité bien avant d'avoir un problème d'addition. Le tableur fonctionne jusqu'au jour où quelqu'un conteste un calcul de trois mois passés.",
      { h: "Le brut, le net, et d'où viennent les chicanes" },
      "Prenons une vraie transaction. Vente brute : 7 677 $. Coût fournisseur : 5 078 $. Profit net : 2 599 $. C'est sur ce dernier chiffre que la répartition doit s'appliquer.",
      "Chez Zeniva Travel, l'agent conserve 70 % du net — 1 819,30 $ — et la plateforme 30 %. Publié d'avance, appliqué au net.",
      "La quasi-totalité des différends entre une plateforme et ses partenaires vient de cette distinction. Un « 50 % du brut » et un « 70 % du net » peuvent donner des montants comparables, ou des écarts du simple au double, selon la marge fournisseur. Si votre entente ne dit pas explicitement laquelle des deux bases s'applique, elle sera interprétée différemment de chaque côté de la table.",
      { h: "Qui absorbe les frais de traitement" },
      "Sur un paiement par carte de 7 677 $, le traitement à 2,7 % + 30 ¢ représente environ 207,58 $. Cet argent sort avant que quiconque soit payé. Trois choix possibles, et il faut en choisir un par écrit : la plateforme l'absorbe, il est déduit avant la répartition, ou il est déduit de la part du partenaire.",
      "Il n'y a pas de bonne réponse universelle. Il y a seulement une bonne pratique : que ce soit un paramètre visible des deux côtés, pas une surprise sur le relevé.",
      { h: "Les remboursements et les rétrofacturations" },
      "Une répartition qui ne sait pas s'inverser est une bombe à retardement. Si un client est remboursé, la part de chaque partie doit être reprise proportionnellement et automatiquement. Une plateforme qui doit courir après ses partenaires pour récupérer de l'argent déjà versé perd ses partenaires.",
      { h: "Ce que l'automatisation change, étape par étape" },
      "1. Le client paie la plateforme — carte, virement ACH ou lien de paiement. La plateforme est le marchand officiel.",
      "2. La plateforme enregistre le coût fournisseur et calcule le profit net.",
      "3. La règle de répartition s'exécute : part du partenaire, part de la plateforme, part du référent s'il y en a un. Chaque part se dépose dans le portefeuille de son titulaire avec l'identifiant de la transaction — chaque dollar est traçable.",
      "4. Les versements partent selon l'horaire choisi par chaque partie : instantané, quotidien ou hebdomadaire. Les écritures se rendent dans QuickBooks, Xero, Wave ou FreshBooks sans ressaisie.",
      { h: "Le cas des entrepreneurs en construction" },
      "Le même mécanisme fait tourner ZeniCorp, la plateforme de construction du groupe au Québec : le client paie 30 % du contrat à la signature, l'entrepreneur conserve 70 %, et la répartition s'applique au moment du paiement plutôt qu'à la fin du mois. Pour un entrepreneur, la différence est concrète : il sait exactement ce qu'il reçoit, quand, et sur quelle base.",
      { h: "Les cinq questions à poser avant de signer" },
      "Sur le brut ou sur le net ? Qui absorbe les frais de traitement ? Le versement arrive quand — à la vente, à la livraison, ou sur un cycle mensuel ? Que se passe-t-il en cas de remboursement ou de rétrofacturation ? Et, la plus importante : est-ce que je peux voir le calcul de chaque transaction, pas seulement le total du mois ?",
      "Si la réponse à la dernière question est « faites-nous confiance », la plateforme n'est pas prête à avoir des partenaires.",
      { h: "Pour les plateformes québécoises" },
      "ZeniPay intègre vos partenaires comme sous-marchands, applique les règles de répartition sur le profit net, verse automatiquement et conserve une piste d'audit par transaction — sous votre marque. La plateforme fonctionne en français et en anglais, pour le Canada et les États-Unis.",
      "Voir zenipay.ca/merchant.",
    ],
  },
];

export function findPost(slug: string): BlogPost | null {
  return POSTS.find((p) => p.slug === slug) ?? null;
}
