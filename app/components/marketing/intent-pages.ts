// Copy for the high-intent landing pages. FR pages live under /fr,
// EN pages at the root. Each pair is linked with hreflang.
//
// Facts used here come from the code (2026-10-01):
//  - /pay/[id]: customer pays by card (Finix, tokenized fields) or by bank
//    transfer (EFT, capped at $2,500 per transaction, 3–5 business days).
//  - Links/invoices can be in CAD or USD; cards are charged in CAD and a USD
//    amount shows the customer its CAD equivalent before paying.
//  - lib/zenipay/installments.ts: 2 to 12 installments per invoice, by amount
//    or percentage, each with its own payment link, emailed on its due date,
//    reminders, receipt, invoice moves from partial to paid.
//  - app/app/pay-links: amount, currency, description, optional expiry,
//    copy URL, QR code, status per link.
// Never add rates, "no fees", SOC 2 or "bank" wording here.

import type { IntentLandingData } from "./IntentLanding";

const REGISTER = "/register?type=business";

const RELATED_FR = [
  { label: "Lien de paiement", href: "/fr/lien-de-paiement" },
  { label: "Facturation en ligne", href: "/fr/facturation-en-ligne" },
  { label: "Paiement en versements", href: "/fr/paiement-en-versements" },
  { label: "Processeur de paiement au Canada", href: "/fr/processeur-de-paiement-canada" },
  { label: "Frais de carte de crédit pour une PME", href: "/blog/frais-traitement-carte-credit-pme-quebec" },
  { label: "Guide : facturer avec la TPS et la TVQ", href: "/fr/guides/facturer-en-ligne-quebec-tps-tvq" },
  { label: "Guide : envoyer un lien de paiement", href: "/fr/guides/envoyer-lien-de-paiement-client" },
  { label: "Guide : offrir le paiement en versements", href: "/fr/guides/offrir-paiement-en-versements" },
  { label: "Sécurité", href: "/security" },
];
const RELATED_EN = [
  { label: "Payment links", href: "/paylinks" },
  { label: "Online invoicing", href: "/invoices" },
  { label: "Installment payments", href: "/installments" },
  { label: "Payment processing in Canada", href: "/payments" },
  { label: "Guide: GST and QST invoicing in Québec", href: "/guides/quebec-invoicing-gst-qst" },
  { label: "Guide: sending a payment link", href: "/guides/how-to-send-a-payment-link" },
  { label: "Guide: offering installment payments", href: "/guides/offering-installment-payments" },
  { label: "Security", href: "/security" },
  { label: "Contact", href: "/contact" },
];
const rel = (list: typeof RELATED_FR, self: string) => list.filter((r) => r.href !== self);

const CARD_FACT_FR = "Cartes traitées par Finix, un processeur certifié PCI DSS niveau 1";
const CARD_FACT_EN = "Cards processed by Finix, a PCI DSS Level 1 processor";

// ─── FR ─────────────────────────────────────────────────────────────────────

export const FR_HOME: IntentLandingData = {
  lang: "fr",
  path: "/fr",
  alternatePath: "/",
  title: "ZeniPay — Liens de paiement, factures et versements pour PME au Canada",
  description:
    "Plateforme de paiement en ligne pour PME canadiennes : liens de paiement, facturation, paiement en versements, cartes et virements. Cartes traitées par Finix (PCI DSS niveau 1). CAD et USD. Fait au Québec.",
  breadcrumb: "Accueil",
  eyebrow: "Plateforme de paiement · Fait au Québec",
  h1: "Faites-vous payer en ligne : liens de paiement, factures et versements",
  lead:
    "ZeniPay est une plateforme technologique de paiement pour les PME et les boutiques en ligne du Canada. Vous envoyez un lien ou une facture, votre client paie par carte ou par virement, et vous suivez chaque paiement au même endroit. Orvel, l'assistant IA intégré, prépare les factures et les relances quand vous le lui demandez.",
  primaryCta: { label: "Ouvrir un compte d'entreprise", href: REGISTER },
  secondaryCta: { label: "Nous écrire", href: "/contact" },
  facts: [CARD_FACT_FR, "Montants en CAD ou en USD", "Interface et soutien en français et en anglais"],
  sections: [
    {
      h2: "Ce que ZeniPay fait pour votre entreprise",
      bullets: [
        "Liens de paiement : un montant, une description, un lien à copier ou un code QR. Le client paie sans que vous ayez de site web.",
        "Facturation en ligne : la facture part par courriel avec son bouton de paiement, et son statut passe à « payée » toute seule.",
        "Paiement en versements : une facture divisée en 2 à 12 versements, chacun avec son propre lien, envoyé à sa date d'échéance.",
        "Paiement par carte ou par virement bancaire (TEF, jusqu'à 2 500 $ par transaction).",
        "Orvel, l'assistant IA : « Facture Jean Tremblay 2 000 $ en 3 versements » et la facture est créée, les liens partent aux bonnes dates.",
      ],
    },
    {
      h2: "Pour qui ?",
      paragraphs: [
        "Les entrepreneurs et travailleurs autonomes qui envoient des soumissions et veulent un dépôt avant de commencer, les boutiques en ligne qui veulent un paiement sans intégration compliquée, et les entreprises de services qui facturent en plusieurs étapes (rénovation, événements, formations, voyages de groupe).",
      ],
    },
    {
      h2: "Qui est derrière ZeniPay ?",
      paragraphs: [
        "ZeniPay Inc. est une entreprise canadienne fondée en 2026 par Alexandre Blais, à Québec. Elle fait partie du Groupe Zeniva. ZeniPay n'est pas une banque : c'est une plateforme logicielle de paiement. Le traitement des cartes est confié à Finix, un processeur certifié PCI DSS niveau 1.",
      ],
    },
  ],
  steps: {
    h2: "Comment commencer",
    items: [
      { title: "Ouvrez votre compte", body: "Inscription en ligne, puis vérification de l'entreprise exigée avant d'accepter des paiements." },
      { title: "Créez un lien ou une facture", body: "Dans le tableau de bord, ou en le demandant à Orvel en français." },
      { title: "Recevez le paiement", body: "Le client paie par carte ou par virement ; vous voyez le statut en temps réel." },
    ],
  },
  faq: [
    {
      q: "Qu'est-ce que ZeniPay ?",
      a: "ZeniPay est une plateforme canadienne de paiement en ligne pour les PME : liens de paiement, facturation, paiement en versements, paiements par carte et par virement. Les cartes sont traitées par Finix, un processeur certifié PCI DSS niveau 1. L'entreprise est basée au Québec et sert le Canada et les États-Unis.",
    },
    {
      q: "ZeniPay est-elle une banque ?",
      a: "Non. ZeniPay est une plateforme technologique de paiement, pas une banque ni une institution de dépôt. Elle vous permet d'encaisser des paiements de vos clients et de les suivre.",
    },
    {
      q: "Combien coûte ZeniPay ?",
      a: "Les frais dépendent du type de paiement et de votre entreprise. Écrivez à info@zeniva.ca pour obtenir la tarification qui s'applique à votre situation avant de commencer.",
    },
    {
      q: "Mes clients doivent-ils avoir un compte ZeniPay pour payer ?",
      a: "Non. Votre client ouvre le lien reçu par courriel ou par message, puis paie par carte ou par virement bancaire, sans créer de compte.",
    },
    {
      q: "Est-ce que ZeniPay fonctionne en français ?",
      a: "Oui. L'entreprise est au Québec : les courriels de facture et de versement sont en français (avec une ligne en anglais), et Orvel répond dans la langue de votre message.",
    },
  ],
  related: rel(RELATED_FR, "/fr"),
  serviceName: "ZeniPay — plateforme de paiement en ligne pour PME",
  serviceType: "Plateforme de paiement en ligne",
};

export const FR_PAYLINK: IntentLandingData = {
  lang: "fr",
  path: "/fr/lien-de-paiement",
  alternatePath: "/paylinks",
  title: "Lien de paiement pour PME au Canada — sans site web | ZeniPay",
  description:
    "Créez un lien de paiement en quelques secondes et envoyez-le par courriel, texto ou code QR. Votre client paie par carte ou par virement. Cartes traitées par Finix (PCI DSS niveau 1). CAD ou USD.",
  breadcrumb: "Lien de paiement",
  eyebrow: "Lien de paiement",
  h1: "Lien de paiement : faites-vous payer sans site web",
  lead:
    "Un lien de paiement, c'est une page de paiement sécurisée que vous créez en indiquant un montant et une description. Vous la partagez comme vous voulez — courriel, texto, Messenger, code QR — et votre client paie par carte ou par virement bancaire. Aucune intégration, aucun code.",
  primaryCta: { label: "Créer mon premier lien", href: REGISTER },
  secondaryCta: { label: "Poser une question", href: "/contact" },
  facts: [CARD_FACT_FR, "Code QR inclus", "Montant en CAD ou en USD"],
  sections: [
    {
      h2: "À quoi sert un lien de paiement ?",
      paragraphs: [
        "Le lien de paiement remplace le chèque, le virement Interac à confirmer à la main et le terminal que vous n'avez pas. Il sert surtout à encaisser un dépôt sur une soumission, à vendre un produit ou un service sans boutique en ligne, à se faire payer après un appel ou une visite, et à afficher un code QR au comptoir ou sur un kiosque.",
      ],
    },
    {
      h2: "Ce que contient un lien ZeniPay",
      bullets: [
        "Le montant, la devise (CAD ou USD) et la description de ce que le client achète.",
        "Une date d'expiration si vous le voulez : passé cette date, le lien ne fonctionne plus.",
        "Le nom et le logo de votre entreprise sur la page de paiement.",
        "Deux modes de paiement : carte de crédit ou de débit, ou virement bancaire (TEF) jusqu'à 2 500 $ par transaction.",
        "Un suivi dans votre tableau de bord : lien actif, payé ou expiré.",
      ],
    },
    {
      h2: "Et la sécurité ?",
      paragraphs: [
        "Les numéros de carte sont saisis dans des champs sécurisés fournis par Finix, un processeur certifié PCI DSS niveau 1 : ils ne passent jamais par vos courriels ni par vos serveurs. Pour un montant en USD, la carte est débitée en dollars canadiens et le client voit l'équivalent en CAD avant de payer.",
      ],
    },
  ],
  steps: {
    h2: "Créer un lien de paiement en 3 étapes",
    items: [
      { title: "Entrez le montant", body: "Montant, devise, description et, au besoin, une date d'expiration." },
      { title: "Partagez le lien", body: "Copiez l'adresse ou montrez le code QR. Courriel, texto, réseaux sociaux : tout fonctionne." },
      { title: "Suivez le paiement", body: "Le statut change dès que le client a payé." },
    ],
  },
  faq: [
    {
      q: "Comment créer un lien de paiement au Canada ?",
      a: "Avec ZeniPay : ouvrez un compte d'entreprise, faites vérifier votre entreprise, puis cliquez sur « Créer un lien », entrez le montant et la description. Vous obtenez une adresse à partager et un code QR.",
    },
    {
      q: "Mon client a-t-il besoin d'un compte pour payer par lien ?",
      a: "Non. Il ouvre le lien et paie par carte ou par virement bancaire, sans inscription.",
    },
    {
      q: "Puis-je envoyer un lien de paiement par texto ?",
      a: "Oui. Le lien est une simple adresse web : vous pouvez le coller dans un texto, un courriel, Messenger ou l'afficher sous forme de code QR.",
    },
    {
      q: "Quelle est la différence entre un lien de paiement et une facture ?",
      a: "Le lien sert à encaisser un montant rapidement. La facture contient le détail du client et du travail, garde un numéro et un historique, et peut être divisée en versements. Les deux se paient en ligne.",
    },
    {
      q: "Combien coûte un lien de paiement ZeniPay ?",
      a: "La création du lien est incluse dans le compte. Des frais de traitement s'appliquent aux paiements ; écrivez à info@zeniva.ca pour connaître la tarification qui s'applique à votre entreprise.",
    },
  ],
  related: rel(RELATED_FR, "/fr/lien-de-paiement"),
  serviceName: "Lien de paiement ZeniPay",
  serviceType: "Lien de paiement en ligne",
};

export const FR_INVOICE: IntentLandingData = {
  lang: "fr",
  path: "/fr/facturation-en-ligne",
  alternatePath: "/invoices",
  title: "Facturation en ligne avec paiement intégré pour PME | ZeniPay",
  description:
    "Envoyez vos factures par courriel avec un bouton de paiement : votre client paie par carte ou par virement, la facture passe à « payée » toute seule. Dépôts, versements et relances. Fait au Québec.",
  breadcrumb: "Facturation en ligne",
  eyebrow: "Facturation en ligne",
  h1: "Facturation en ligne : la facture qui se paie toute seule",
  lead:
    "Avec ZeniPay, chaque facture part par courriel avec son lien de paiement. Votre client paie en ligne par carte ou par virement bancaire, la facture passe de « envoyée » à « payée » sans que vous ayez à la cocher, et le reçu part automatiquement.",
  primaryCta: { label: "Envoyer ma première facture", href: REGISTER },
  secondaryCta: { label: "Voir le paiement en versements", href: "/fr/paiement-en-versements" },
  facts: [CARD_FACT_FR, "Factures en CAD ou en USD", "Courriels de facture en français"],
  sections: [
    {
      h2: "Pourquoi une facture avec paiement intégré ?",
      paragraphs: [
        "Une facture PDF envoyée par courriel oblige le client à trouver un moyen de vous payer, puis vous oblige à vérifier si l'argent est arrivé. Une facture avec bouton de paiement supprime ces deux étapes : le client paie au moment où il lit la facture, et vous voyez le statut changer.",
      ],
    },
    {
      h2: "Ce que comprend la facturation ZeniPay",
      bullets: [
        "Facture envoyée par courriel avec un bouton « Payer », au nom de votre entreprise.",
        "Paiement par carte ou par virement bancaire (TEF, jusqu'à 2 500 $ par transaction).",
        "Facture en un seul paiement, ou divisée en dépôt et versements (2 à 12), chacun avec son lien.",
        "Rappels automatiques 3 et 7 jours après l'échéance d'un versement impayé, puis reçu envoyé au client à chaque paiement.",
        "Statut à jour : envoyée, partiellement payée, payée.",
        "Orvel, l'assistant IA, peut préparer et envoyer la facture quand vous la lui décrivez en français.",
      ],
    },
    {
      h2: "Pour quelles entreprises ?",
      paragraphs: [
        "Entrepreneurs en construction et rénovation qui demandent un dépôt, consultants et pigistes qui facturent au mois, organisateurs d'événements et de voyages de groupe, écoles et formateurs qui encaissent des inscriptions en plusieurs paiements.",
      ],
    },
  ],
  steps: {
    h2: "Envoyer une facture payable en ligne",
    items: [
      { title: "Créez la facture", body: "Client, courriel, montant et description — ou demandez-la à Orvel." },
      { title: "Choisissez le paiement", body: "En une fois, ou en dépôt et versements à des dates précises." },
      { title: "ZeniPay s'occupe du reste", body: "Envoi, rappels, reçu et statut payé." },
    ],
  },
  faq: [
    {
      q: "Comment envoyer une facture que le client peut payer en ligne ?",
      a: "Créez la facture dans ZeniPay avec le courriel du client. Elle part avec un bouton de paiement ; le client paie par carte ou par virement bancaire et la facture se marque payée automatiquement.",
    },
    {
      q: "Puis-je demander un dépôt avant de commencer un contrat ?",
      a: "Oui. Divisez la facture en versements : par exemple 30 % aujourd'hui, 30 % le mois prochain et le solde à la fin. Le premier lien part tout de suite, les autres à leur date.",
    },
    {
      q: "Est-ce que ZeniPay envoie des rappels de paiement ?",
      a: "Oui, pour les versements : un rappel est envoyé au client pour chaque versement dû et non payé, puis un reçu quand il paie.",
    },
    {
      q: "Les factures sont-elles en français ?",
      a: "Oui. Les courriels de facture et de versement sont rédigés en français, avec une ligne en anglais pour les clients anglophones.",
    },
  ],
  related: rel(RELATED_FR, "/fr/facturation-en-ligne"),
  serviceName: "Facturation en ligne ZeniPay",
  serviceType: "Logiciel de facturation en ligne avec paiement intégré",
};

export const FR_INSTALLMENTS: IntentLandingData = {
  lang: "fr",
  path: "/fr/paiement-en-versements",
  alternatePath: "/installments",
  title: "Paiement en versements et dépôts pour PME — facture divisée | ZeniPay",
  description:
    "Divisez une facture en dépôt et versements (2 à 12) : chaque versement a son lien de paiement, part à sa date et déclenche un rappel s'il n'est pas payé. Pour entrepreneurs, événements et services.",
  breadcrumb: "Paiement en versements",
  eyebrow: "Paiement en versements",
  h1: "Paiement en versements : dépôt aujourd'hui, solde plus tard, sans courir après",
  lead:
    "Offrir de payer en plusieurs fois aide à conclure une vente. Le problème, c'est le suivi : se souvenir des dates, renvoyer les liens, relancer. Avec ZeniPay, vous divisez la facture une fois, et chaque versement part tout seul à sa date avec son propre lien de paiement.",
  primaryCta: { label: "Créer une facture en versements", href: REGISTER },
  secondaryCta: { label: "Nous écrire", href: "/contact" },
  facts: ["De 2 à 12 versements par facture", "En montant ou en pourcentage", "Rappels et reçus automatiques"],
  sections: [
    {
      h2: "Comment ça fonctionne",
      bullets: [
        "Vous choisissez le nombre de versements (de 2 à 12) et, pour chacun, un montant ou un pourcentage du total, et une date.",
        "Les versements dus aujourd'hui partent tout de suite par courriel ; les autres partent automatiquement à leur date d'échéance.",
        "Chaque versement a son propre lien : le client paie par carte ou par virement bancaire.",
        "Un rappel part 3 jours puis 7 jours après l'échéance si le versement n'est pas payé, et un reçu part dès qu'il l'est.",
        "La facture passe de « partiellement payée » à « payée » quand le dernier versement est reçu.",
      ],
    },
    {
      h2: "Exemple réel de demande à Orvel",
      paragraphs: [
        "« Facture Jean Tremblay 2 000 $ plus taxes, en 3 paiements : 30 % aujourd'hui, 30 % le mois prochain, le solde dans deux mois. » Orvel crée la facture, envoie le premier lien à Jean et programme les deux autres. Vous gardez le contrôle : Orvel n'agit que dans les permissions que vous lui donnez, et chaque action est consignée.",
      ],
    },
    {
      h2: "Versements ou financement ?",
      paragraphs: [
        "Ici, c'est vous qui accordez le délai à votre client : il n'y a pas de prêteur, pas de vérification de crédit et pas d'intérêts facturés par ZeniPay. Le client paie chaque versement à sa date ; le risque de non-paiement reste le vôtre, comme avec une facture classique, d'où l'intérêt d'un premier dépôt.",
      ],
    },
  ],
  faq: [
    {
      q: "Comment offrir le paiement en plusieurs fois à mes clients ?",
      a: "Créez une facture dans ZeniPay et divisez-la en 2 à 12 versements, en montant ou en pourcentage, avec une date pour chacun. Chaque versement est envoyé au client avec son lien de paiement à sa date.",
    },
    {
      q: "Puis-je exiger un dépôt avant de commencer les travaux ?",
      a: "Oui. Mettez le premier versement à la date d'aujourd'hui : il part immédiatement et vous voyez quand il est payé.",
    },
    {
      q: "Que se passe-t-il si mon client ne paie pas un versement ?",
      a: "ZeniPay envoie un rappel par courriel. Vous voyez dans le tableau de bord quels versements sont en retard et vous pouvez renvoyer ou annuler un versement.",
    },
    {
      q: "Mon client paie-t-il des intérêts ?",
      a: "Non, ZeniPay ne prête pas d'argent et ne facture pas d'intérêts au client. Les versements sont simplement des parts de votre facture payables à des dates différentes.",
    },
  ],
  related: rel(RELATED_FR, "/fr/paiement-en-versements"),
  serviceName: "Paiement en versements ZeniPay",
  serviceType: "Facturation en versements et dépôts",
};

export const FR_PROCESSOR: IntentLandingData = {
  lang: "fr",
  path: "/fr/processeur-de-paiement-canada",
  alternatePath: "/payments",
  title: "Processeur de paiement au Canada pour PME et boutiques en ligne | ZeniPay",
  description:
    "Acceptez les cartes de crédit et de débit et les virements bancaires au Canada. Cartes traitées par Finix, processeur PCI DSS niveau 1. Liens, factures, versements et API. Ce qu'il faut comparer avant de choisir.",
  breadcrumb: "Processeur de paiement au Canada",
  eyebrow: "Paiements par carte et par virement",
  h1: "Processeur de paiement au Canada : accepter les cartes sans complication",
  lead:
    "ZeniPay permet aux PME et aux boutiques en ligne canadiennes d'accepter les paiements par carte et par virement bancaire, par lien, par facture ou par API. Le traitement des cartes est assuré par Finix, un processeur certifié PCI DSS niveau 1 ; ZeniPay ajoute par-dessus la facturation, les versements, le suivi et un assistant IA.",
  primaryCta: { label: "Ouvrir un compte marchand", href: REGISTER },
  secondaryCta: { label: "Demander la tarification", href: "/contact" },
  facts: [CARD_FACT_FR, "Paiement par carte ou par virement (TEF)", "API et documentation pour développeurs"],
  sections: [
    {
      h2: "Ce que vous pouvez encaisser",
      bullets: [
        "Cartes de crédit et de débit, saisies dans des champs sécurisés (le numéro de carte ne touche jamais vos serveurs).",
        "Virements bancaires (TEF) jusqu'à 2 500 $ par transaction, réglés en 3 à 5 jours ouvrables.",
        "Montants en CAD ou en USD ; les cartes sont débitées en dollars canadiens et le client voit l'équivalent avant de payer.",
        "Par lien de paiement, par facture, en versements, ou directement depuis votre site avec l'API.",
      ],
    },
    {
      h2: "Comment choisir un processeur de paiement au Canada",
      paragraphs: [
        "Avant de signer avec n'importe quel fournisseur, comparez ces points. Ils pèsent souvent plus que le taux affiché.",
      ],
      bullets: [
        "Le niveau de conformité PCI DSS du processeur qui traite réellement les cartes.",
        "La devise de règlement et les frais de conversion si vous vendez en USD.",
        "Le délai avant que l'argent arrive dans votre compte bancaire.",
        "La durée du contrat et les frais de résiliation.",
        "La gestion des rétrofacturations (chargebacks) et des remboursements.",
        "Les outils inclus : liens, factures, versements, rapports, API.",
        "La langue du soutien et de ce que reçoivent vos clients.",
      ],
    },
    {
      h2: "Les frais de carte, en clair",
      paragraphs: [
        "Les frais d'une transaction par carte combinent l'interchange (fixé par les réseaux et versé à la banque du client), les frais de réseau et la marge du processeur. Notre guide détaille ces composantes et les seuils de la réduction fédérale pour les petites entreprises.",
      ],
    },
  ],
  steps: {
    h2: "Commencer à accepter les paiements",
    items: [
      { title: "Inscription", body: "Ouvrez votre compte d'entreprise en ligne." },
      { title: "Vérification", body: "Le processeur exige la vérification de l'entreprise avant le premier paiement." },
      { title: "Premiers paiements", body: "Envoyez un lien ou une facture, ou branchez l'API sur votre site." },
    ],
  },
  faq: [
    {
      q: "Quel processeur de paiement choisir pour une PME au Canada ?",
      a: "Comparez la conformité PCI DSS du processeur, la devise de règlement, le délai de versement, la durée du contrat, la gestion des rétrofacturations et les outils inclus. ZeniPay s'adresse aux PME qui veulent liens, factures et versements dans le même outil, avec des cartes traitées par Finix (PCI DSS niveau 1).",
    },
    {
      q: "Faut-il un site web pour accepter les cartes ?",
      a: "Non. Avec un lien de paiement ou une facture ZeniPay, votre client paie sur une page sécurisée hébergée par ZeniPay.",
    },
    {
      q: "Quels sont les frais de ZeniPay ?",
      a: "La tarification dépend du type de paiement et de votre entreprise ; nous ne publions pas de taux génériques. Écrivez à info@zeniva.ca pour une soumission.",
    },
    {
      q: "Est-ce que ZeniPay accepte les entreprises des États-Unis ?",
      a: "ZeniPay sert le Canada et les États-Unis. Écrivez-nous avec le pays et le type d'entreprise pour confirmer l'admissibilité avant de vous inscrire.",
    },
  ],
  related: rel(RELATED_FR, "/fr/processeur-de-paiement-canada"),
  serviceName: "Traitement des paiements ZeniPay",
  serviceType: "Processeur de paiement en ligne",
};

// ─── EN ─────────────────────────────────────────────────────────────────────

export const EN_PAYLINK: IntentLandingData = {
  lang: "en",
  path: "/paylinks",
  alternatePath: "/fr/lien-de-paiement",
  title: "Payment links for Canadian businesses — no website needed | ZeniPay",
  description:
    "Create a payment link in seconds and share it by email, text or QR code. Customers pay by card or bank transfer. Cards processed by Finix (PCI DSS Level 1). CAD or USD.",
  breadcrumb: "Payment links",
  eyebrow: "Payment links",
  h1: "Payment links: get paid without a website",
  lead:
    "A payment link is a secure checkout page you create by entering an amount and a description. Share it any way you like — email, text, Messenger, QR code — and your customer pays by card or bank transfer. No integration, no code.",
  primaryCta: { label: "Create my first link", href: REGISTER },
  secondaryCta: { label: "Ask a question", href: "/contact" },
  facts: [CARD_FACT_EN, "QR code included", "Amount in CAD or USD"],
  sections: [
    {
      h2: "What a payment link is for",
      paragraphs: [
        "Collect a deposit on a quote, sell a product or service without an online store, get paid after a call or a visit, or show a QR code at a counter or a booth.",
      ],
    },
    {
      h2: "What a ZeniPay link includes",
      bullets: [
        "Amount, currency (CAD or USD) and a description of what the customer is buying.",
        "An optional expiry date, after which the link stops working.",
        "Your business name and logo on the checkout page.",
        "Two ways to pay: credit or debit card, or bank transfer (EFT) up to $2,500 per transaction.",
        "Status tracking in your dashboard: active, paid or expired.",
      ],
    },
    {
      h2: "Security",
      paragraphs: [
        "Card numbers are entered in secure fields provided by Finix, a PCI DSS Level 1 processor, so they never pass through your email or your servers. For a USD amount, the card is charged in Canadian dollars and the customer sees the CAD equivalent before paying.",
      ],
    },
  ],
  faq: [
    {
      q: "How do I create a payment link in Canada?",
      a: "Open a ZeniPay business account, complete the business verification, then click “Create link”, enter the amount and description. You get a URL to share and a QR code.",
    },
    {
      q: "Does my customer need an account to pay?",
      a: "No. They open the link and pay by card or bank transfer without signing up.",
    },
    {
      q: "What is the difference between a payment link and an invoice?",
      a: "A link collects an amount quickly. An invoice carries the customer and job details, keeps a number and a history, and can be split into installments. Both are paid online.",
    },
    {
      q: "How much does a ZeniPay payment link cost?",
      a: "Creating links is part of the account. Processing fees apply to payments; email info@zeniva.ca for the pricing that applies to your business.",
    },
  ],
  related: rel(RELATED_EN, "/paylinks"),
  serviceName: "ZeniPay payment links",
  serviceType: "Online payment links",
};

export const EN_INVOICE: IntentLandingData = {
  lang: "en",
  path: "/invoices",
  alternatePath: "/fr/facturation-en-ligne",
  title: "Online invoicing with built-in payment for small businesses | ZeniPay",
  description:
    "Send invoices by email with a pay button: customers pay by card or bank transfer and the invoice marks itself paid. Deposits, installments and reminders. Built in Québec.",
  breadcrumb: "Online invoicing",
  eyebrow: "Online invoicing",
  h1: "Online invoicing: invoices that get paid on their own",
  lead:
    "With ZeniPay, every invoice goes out by email with its own payment link. Your customer pays online by card or bank transfer, the invoice moves from “sent” to “paid” without you ticking a box, and the receipt goes out automatically.",
  primaryCta: { label: "Send my first invoice", href: REGISTER },
  secondaryCta: { label: "See installment payments", href: "/installments" },
  facts: [CARD_FACT_EN, "Invoices in CAD or USD", "Bilingual invoice emails"],
  sections: [
    {
      h2: "What ZeniPay invoicing includes",
      bullets: [
        "Invoice emailed with a “Pay” button, under your business name.",
        "Payment by card or bank transfer (EFT, up to $2,500 per transaction).",
        "One payment, or a deposit plus installments (2 to 12), each with its own link.",
        "Automatic reminders 3 and 7 days after an unpaid installment is due, and a receipt for every payment.",
        "Live status: sent, partially paid, paid.",
        "Orvel, the built-in AI assistant, can draft and send the invoice when you describe it in plain English or French.",
      ],
    },
    {
      h2: "Who it is for",
      paragraphs: [
        "Contractors who ask for a deposit, consultants and freelancers who bill monthly, event and group-travel organizers, schools and trainers who collect registrations in several payments.",
      ],
    },
  ],
  faq: [
    {
      q: "How do I send an invoice my customer can pay online?",
      a: "Create the invoice in ZeniPay with the customer's email. It goes out with a pay button; the customer pays by card or bank transfer and the invoice is marked paid automatically.",
    },
    {
      q: "Can I ask for a deposit before starting a job?",
      a: "Yes. Split the invoice into installments — for example 30% today, 30% next month, balance at the end. The first link goes out right away, the others on their dates.",
    },
    {
      q: "Does ZeniPay send payment reminders?",
      a: "Yes, for installments: the customer gets a reminder for each installment that is due and unpaid, then a receipt once paid.",
    },
  ],
  related: rel(RELATED_EN, "/invoices"),
  serviceName: "ZeniPay online invoicing",
  serviceType: "Online invoicing with built-in payment",
};

export const EN_INSTALLMENTS: IntentLandingData = {
  lang: "en",
  path: "/installments",
  alternatePath: "/fr/paiement-en-versements",
  title: "Installment payments and deposits for small businesses | ZeniPay",
  description:
    "Split an invoice into a deposit and installments (2 to 12): each one has its own payment link, goes out on its date and triggers a reminder if unpaid. For contractors, events and services.",
  breadcrumb: "Installment payments",
  eyebrow: "Installment payments",
  h1: "Installment payments: deposit today, balance later, no chasing",
  lead:
    "Letting customers pay in several parts helps close the sale. The hard part is the follow-up: remembering dates, resending links, chasing. With ZeniPay you split the invoice once, and each installment goes out on its own date with its own payment link.",
  primaryCta: { label: "Create an installment invoice", href: REGISTER },
  secondaryCta: { label: "Contact us", href: "/contact" },
  facts: ["2 to 12 installments per invoice", "By amount or percentage", "Automatic reminders and receipts"],
  sections: [
    {
      h2: "How it works",
      bullets: [
        "Choose 2 to 12 installments and, for each, an amount or a percentage of the total, and a date.",
        "Installments due today are emailed at once; the others go out automatically on their due dates.",
        "Each installment has its own link: the customer pays by card or bank transfer.",
        "A reminder goes out 3 and 7 days after the due date if unpaid, and a receipt as soon as it is paid.",
        "The invoice moves from “partially paid” to “paid” when the last installment comes in.",
      ],
    },
    {
      h2: "Installments are not financing",
      paragraphs: [
        "You are the one giving your customer time to pay: there is no lender, no credit check and no interest charged by ZeniPay. The non-payment risk stays with you, as with any invoice — which is why a first deposit matters.",
      ],
    },
  ],
  faq: [
    {
      q: "How can I let customers pay in installments?",
      a: "Create an invoice in ZeniPay and split it into 2 to 12 installments by amount or percentage, each with a date. Each installment is emailed with its payment link on its date.",
    },
    {
      q: "Does the customer pay interest?",
      a: "No. ZeniPay does not lend money or charge interest. Installments are simply parts of your invoice payable on different dates.",
    },
    {
      q: "What happens if an installment is not paid?",
      a: "ZeniPay emails a reminder. Your dashboard shows overdue installments and lets you resend or cancel one.",
    },
  ],
  related: rel(RELATED_EN, "/installments"),
  serviceName: "ZeniPay installment payments",
  serviceType: "Installment invoicing and deposits",
};

export const EN_PAYMENTS: IntentLandingData = {
  lang: "en",
  path: "/payments",
  alternatePath: "/fr/processeur-de-paiement-canada",
  title: "Payment processing in Canada for small businesses | ZeniPay",
  description:
    "Accept credit and debit cards and bank transfers in Canada. Cards processed by Finix, a PCI DSS Level 1 processor. Payment links, invoices, installments and an API.",
  breadcrumb: "Payment processing",
  eyebrow: "Card and bank payments",
  h1: "Payment processing in Canada, without the complexity",
  lead:
    "ZeniPay lets Canadian small businesses and online stores accept card and bank-transfer payments by link, by invoice or by API. Card processing is handled by Finix, a PCI DSS Level 1 processor; ZeniPay adds invoicing, installments, tracking and an AI assistant on top.",
  primaryCta: { label: "Open a merchant account", href: REGISTER },
  secondaryCta: { label: "Ask for pricing", href: "/contact" },
  facts: [CARD_FACT_EN, "Card or bank transfer (EFT)", "API and developer docs"],
  sections: [
    {
      h2: "What you can accept",
      bullets: [
        "Credit and debit cards, entered in secure fields (card numbers never touch your servers).",
        "Bank transfers (EFT) up to $2,500 per transaction, settling in 3 to 5 business days.",
        "Amounts in CAD or USD; cards are charged in Canadian dollars and the customer sees the equivalent before paying.",
        "By payment link, invoice, installments, or from your own site with the API.",
      ],
    },
    {
      h2: "How to choose a payment processor in Canada",
      bullets: [
        "The PCI DSS level of the processor that actually handles the cards.",
        "Settlement currency and conversion costs if you sell in USD.",
        "How long before funds reach your bank account.",
        "Contract length and cancellation fees.",
        "Chargeback and refund handling.",
        "Included tools: links, invoices, installments, reporting, API.",
        "Support language, and the language your customers see.",
      ],
    },
  ],
  faq: [
    {
      q: "Do I need a website to accept cards?",
      a: "No. With a ZeniPay payment link or invoice, your customer pays on a secure page hosted by ZeniPay.",
    },
    {
      q: "What are ZeniPay's fees?",
      a: "Pricing depends on the payment type and your business; we do not publish generic rates. Email info@zeniva.ca for a quote.",
    },
    {
      q: "Is ZeniPay a bank?",
      a: "No. ZeniPay is a payment technology platform, not a bank or deposit-taking institution.",
    },
  ],
  related: rel(RELATED_EN, "/payments"),
  serviceName: "ZeniPay payment processing",
  serviceType: "Online payment processing",
};
