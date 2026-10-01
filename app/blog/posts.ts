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
    slug: "how-commission-splits-work-travel-agents-platforms",
    title: "How commission splits work for travel agents and platforms — with a real example.",
    description:
      "A plain-language walkthrough of how a travel booking turns into commission, how a platform splits net profit with an independent agent (Zeniva's public 70/30 model), what \"net\" actually means, and what a platform needs to automate the split, the payout and the accounting.",
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
      "Net profit should be computed after the supplier cost and after payment processing fees, because those fees are real money that leaves before anyone is paid. On a $7,677 card payment, a hypothetical rate of 2.7% + 30¢ would cost about $207.58. Whether that fee is deducted before the split or absorbed by the platform must be written down, and both sides should be able to see it.",
      "Chargebacks and refunds follow the same logic: if a booking is refunded, the split reverses proportionally. A platform that cannot reverse a split automatically ends up chasing agents for money — which is how relationships end.",
      { h: "How a platform automates this" },
      "Manually, this is a spreadsheet, a monthly reconciliation and a batch of e-transfers. Automated, it is four steps that happen at payment time:",
      "1. The client pays the platform (card, ACH or payment link). The platform is the merchant of record.",
      "2. The platform records the supplier cost against the booking and computes net profit.",
      "3. The split rule fires: agent 70%, platform 30%, referrer 5 points if tagged. Each party's share is posted to their own wallet or sub-merchant account, with the booking ID, so every dollar is traceable.",
      "4. Payouts run on the schedule each party chose — instant, daily or weekly — and the ledger entries flow to accounting (QuickBooks, Xero, Wave or FreshBooks) without re-keying.",
      "Where ZeniPay stands, honestly: the ledger that records each party's share is built — append-only, idempotent, with a signed audit trail — and agents can be onboarded as sub-merchants. Automated split rules and payouts are the next piece; today the distribution is done manually, and the payment processor connections are still in test mode.",
      { h: "The five questions to ask before signing any split" },
      "Is the split on gross or on net? Who absorbs processing fees? When is the payout — at booking, at travel date, or on a monthly cycle? What happens on a refund or chargeback? Can I see the computation for every booking, not just the total?",
      "If the answer to the last one is \"trust us,\" the platform is not ready for agents.",
      { h: "For platforms" },
      "If you run a marketplace, an agency network or a contractor network and you are still splitting commissions in a spreadsheet, the five questions above are worth asking of any provider, including us. See zenipay.ca/merchant for what is live today.",
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
      "ZeniPay est une plateforme de paiement : liens de paiement, facturation en ligne et paiement en versements, avec des cartes traitées par Finix, un processeur certifié PCI DSS niveau 1. Les frais dépendent de votre entreprise et du type de paiement : écrivez à info@zeniva.ca pour une soumission avant de vous engager. Les comptes se créent en ligne, en français.",
      "Avant de signer avec n'importe quel fournisseur, y compris nous, demandez par écrit les quatre éléments ci-dessus : taux effectif estimé, frais fixes, frais de rétrofacturation et durée du contrat.",
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
      "Sur un paiement par carte de 7 677 $, un tarif hypothétique de 2,7 % + 30 ¢ représenterait environ 207,58 $. Cet argent sort avant que quiconque soit payé. Trois choix possibles, et il faut en choisir un par écrit : la plateforme l'absorbe, il est déduit avant la répartition, ou il est déduit de la part du partenaire.",
      "Il n'y a pas de bonne réponse universelle. Il y a seulement une bonne pratique : que ce soit un paramètre visible des deux côtés, pas une surprise sur le relevé.",
      { h: "Les remboursements et les rétrofacturations" },
      "Une répartition qui ne sait pas s'inverser est une bombe à retardement. Si un client est remboursé, la part de chaque partie doit être reprise proportionnellement et automatiquement. Une plateforme qui doit courir après ses partenaires pour récupérer de l'argent déjà versé perd ses partenaires.",
      { h: "Ce que l'automatisation change, étape par étape" },
      "1. Le client paie la plateforme — carte, virement ACH ou lien de paiement. La plateforme est le marchand officiel.",
      "2. La plateforme enregistre le coût fournisseur et calcule le profit net.",
      "3. La règle de répartition s'exécute : part du partenaire, part de la plateforme, part du référent s'il y en a un. Chaque part se dépose dans le portefeuille de son titulaire avec l'identifiant de la transaction — chaque dollar est traçable.",
      "4. Les versements partent selon l'horaire choisi par chaque partie : instantané, quotidien ou hebdomadaire. Les écritures se rendent dans QuickBooks, Xero, Wave ou FreshBooks sans ressaisie.",
      { h: "Le cas des entrepreneurs en construction" },
      "ZeniCorp, la plateforme de construction du groupe au Québec, publie un modèle du même type : 30 % du contrat payé à la signature, 70 % pour l'entrepreneur. Quand la répartition est automatisée, la différence est concrète pour l'entrepreneur : il sait exactement ce qu'il reçoit, quand, et sur quelle base.",
      { h: "Les cinq questions à poser avant de signer" },
      "Sur le brut ou sur le net ? Qui absorbe les frais de traitement ? Le versement arrive quand — à la vente, à la livraison, ou sur un cycle mensuel ? Que se passe-t-il en cas de remboursement ou de rétrofacturation ? Et, la plus importante : est-ce que je peux voir le calcul de chaque transaction, pas seulement le total du mois ?",
      "Si la réponse à la dernière question est « faites-nous confiance », la plateforme n'est pas prête à avoir des partenaires.",
      { h: "Pour les plateformes québécoises" },
      "Où en est ZeniPay, honnêtement : le grand livre qui enregistre la part de chaque partie est construit — en ajout seul, avec clés d'idempotence et journal d'audit signé — et vos partenaires peuvent être intégrés comme sous-marchands. Les règles de répartition et les versements automatiques sont la prochaine étape ; aujourd'hui, la distribution se fait à la main, et les connexions aux processeurs de paiement sont encore en environnement de test.",
      "Voir zenipay.ca/merchant.",
    ],
  },
];

export function findPost(slug: string): BlogPost | null {
  return POSTS.find((p) => p.slug === slug) ?? null;
}
