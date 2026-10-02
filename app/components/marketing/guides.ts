// Guides FR/EN. Every external figure links to the official page it came
// from; all sources checked on 2026-10-02:
//  - Revenu Québec: Préparation des factures / Preparing Invoices (table by
//    amount), Calcul des taxes / Calculating the Taxes (5 %, 9,975 %,
//    14,975 %, rounding, rates that must not appear), Inscription aux
//    fichiers (30 000 $), Petit fournisseur, Tenue de registres (six ans).
//  - ARC/CRA RC4022: Revenu Québec generally administers the GST/HST in Québec.
//  - LégisQuébec C-11, art. 57 (invoices drawn up in French).
//  - Loi canadienne anti-pourriel / CASL, S.C. 2010, c. 23, s. 1, 6(1), 6(2), 6(6).
//  - Centre antifraude du Canada / Canadian Anti-Fraud Centre: phishing.
//  - OPC: vente à tempérament (definition, évaluation préalable, paiements).
//  - ACFC/FCAC: « Achetez maintenant, payez plus tard » / Buy now, pay later.
// ZeniPay facts come only from what zenipay.ca already shows in production
// (/fr/lien-de-paiement, /fr/facturation-en-ligne, /fr/paiement-en-versements,
// /fr, llms.txt). Never add rates, "no fees", SOC 2 or "bank" wording.

import type { GuideData } from "./GuideArticle";

const REGISTER = "/register?type=business";
const PUBLISHED = "2026-10-02";

const SRC = {
  rqFactFr: { label: "Revenu Québec — Préparation des factures (renseignements exigés selon le montant)", url: "https://www.revenuquebec.ca/fr/entreprises/taxes/tpstvh-et-tvq/perception-de-la-tps-et-de-la-tvq/preparation-des-factures/" },
  rqCalcFr: { label: "Revenu Québec — Calcul des taxes (TPS 5 %, TVQ 9,975 %, arrondi)", url: "https://www.revenuquebec.ca/fr/entreprises/taxes/tpstvh-et-tvq/perception-de-la-tps-et-de-la-tvq/calcul-des-taxes/" },
  rqInscFr: { label: "Revenu Québec — Inscription aux fichiers de la TPS et de la TVQ (seuil de 30 000 $)", url: "https://www.revenuquebec.ca/fr/entreprises/taxes/tpstvh-et-tvq/inscription-aux-fichiers-de-la-tps-et-de-la-tvq/" },
  rqPetitFr: { label: "Revenu Québec — Petit fournisseur", url: "https://www.revenuquebec.ca/fr/citoyens/taxes/biens-et-services-taxables-detaxes-ou-exoneres/tps-et-tvq/autres-situations/particularites-concernant-le-petit-fournisseur/" },
  rqRegFr: { label: "Revenu Québec — Tenue de registres et conservation des pièces justificatives (six ans)", url: "https://www.revenuquebec.ca/fr/entreprises/taxes/tpstvh-et-tvq/regles-de-base-relatives-a-lapplication-de-la-tpstvh-et-de-la-tvq/tenue-de-registres-et-pieces-justificatives/" },
  arcFr: { label: "Agence du revenu du Canada — RC4022, Renseignements généraux sur la TPS/TVH pour les inscrits (la TPS au Québec)", url: "https://www.canada.ca/fr/agence-revenu/services/formulaires-publications/publications/rc4022/renseignements-generaux-tps-tvh-inscrits.html" },
  charteFr: { label: "LégisQuébec — Charte de la langue française (RLRQ, c. C-11), article 57", url: "https://www.legisquebec.gouv.qc.ca/fr/document/lc/C-11" },
  lcapFr: { label: "Justice Canada — Loi canadienne anti-pourriel (L.C. 2010, ch. 23), art. 1 et 6", url: "https://laws-lois.justice.gc.ca/fra/lois/E-1.6/page-1.html" },
  cafcFr: { label: "Centre antifraude du Canada — Hameçonnage", url: "https://antifraudcentre-centreantifraude.ca/scams-fraudes/phishing-hameconnage-fra.htm" },
  opcDefFr: { label: "Office de la protection du consommateur — Qu'est-ce qu'un contrat de vente à tempérament ?", url: "https://www.opc.gouv.qc.ca/commercant/secteur/credit/vente-temperament/definition" },
  opcEvalFr: { label: "Office de la protection du consommateur — Évaluation préalable à la conclusion du contrat", url: "https://www.opc.gouv.qc.ca/commercant/secteur/credit/vente-temperament/contrat/evaluation-prealable" },
  opcPayFr: { label: "Office de la protection du consommateur — Paiements du consommateur (frais de crédit)", url: "https://www.opc.gouv.qc.ca/commercant/secteur/credit/vente-temperament/paiements" },
  acfcFr: { label: "Agence de la consommation en matière financière du Canada — Plans « Achetez maintenant, payez plus tard »", url: "https://www.canada.ca/fr/agence-consommation-matiere-financiere/services/prets/achetez-maintenant-payez-tard.html" },

  rqFactEn: { label: "Revenu Québec — Preparing Invoices (required information by amount)", url: "https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/collecting-gst-and-qst/preparing-invoices/" },
  rqCalcEn: { label: "Revenu Québec — Calculating the Taxes (GST 5%, QST 9.975%, rounding)", url: "https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/collecting-gst-and-qst/calculating-the-taxes/" },
  rqInscEn: { label: "Revenu Québec — Registering for the GST and QST", url: "https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/registering-for-the-gst-and-qst/" },
  rqPetitEn: { label: "Revenu Québec — Details Concerning Small Suppliers ($30,000)", url: "https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/registering-for-the-gst-and-qst/small-suppliers/" },
  rqRegEn: { label: "Revenu Québec — Keeping registers and supporting documents (six years)", url: "https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/basic-rules-for-applying-the-gsthst-and-qst/keeping-registers-and-supporting-documents/" },
  craEn: { label: "Canada Revenue Agency — RC4022, General Information for GST/HST Registrants (GST/HST in Quebec)", url: "https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/rc4022/general-information-gst-hst-registrants.html" },
  charteEn: { label: "LégisQuébec — Charter of the French Language (CQLR, c. C-11), section 57", url: "https://www.legisquebec.gouv.qc.ca/en/document/cs/C-11" },
  caslEn: { label: "Justice Laws — Canada's Anti-Spam Legislation (S.C. 2010, c. 23), ss. 1 and 6", url: "https://laws-lois.justice.gc.ca/eng/acts/E-1.6/page-1.html" },
  cafcEn: { label: "Canadian Anti-Fraud Centre — Phishing", url: "https://antifraudcentre-centreantifraude.ca/scams-fraudes/phishing-hameconnage-eng.htm" },
  opcDefEn: { label: "Office de la protection du consommateur — Instalment sale contracts (merchant section, in French)", url: "https://www.opc.gouv.qc.ca/commercant/secteur/credit/vente-temperament/definition" },
  opcEvalEn: { label: "Office de la protection du consommateur — Assessing the consumer's capacity to repay (in French)", url: "https://www.opc.gouv.qc.ca/commercant/secteur/credit/vente-temperament/contrat/evaluation-prealable" },
  opcPayEn: { label: "Office de la protection du consommateur — Consumer payments and credit charges (in French)", url: "https://www.opc.gouv.qc.ca/commercant/secteur/credit/vente-temperament/paiements" },
  fcacEn: { label: "Financial Consumer Agency of Canada — Buy now, pay later plans", url: "https://www.canada.ca/en/financial-consumer-agency/services/loans/buy-now-pay-later.html" },
};

// ─── FR ─────────────────────────────────────────────────────────────────────

export const FR_GUIDE_PAYLINK: GuideData = {
  lang: "fr",
  path: "/fr/guides/envoyer-lien-de-paiement-client",
  alternatePath: "/guides/how-to-send-a-payment-link",
  title: "Comment envoyer un lien de paiement à un client (courriel, texto, QR) | ZeniPay",
  description:
    "Les 5 étapes pour envoyer un lien de paiement à un client au Canada : quoi écrire, quel canal choisir, comment éviter que le message ressemble à de l'hameçonnage et ce que dit la Loi anti-pourriel.",
  h1: "Comment envoyer un lien de paiement à un client",
  answer:
    "Pour envoyer un lien de paiement à un client, créez le lien dans votre plateforme de paiement (montant, devise, description), puis collez-le dans un courriel ou un texto qui dit qui vous êtes, ce que le client paie et jusqu'à quand ; le client clique, paie par carte ou par virement bancaire, et vous voyez le paiement dans votre tableau de bord. Le reste de ce guide porte sur ce qui fait la différence : le message, le canal et la confiance.",
  breadcrumb: "Envoyer un lien de paiement",
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  readingMinutes: 6,
  keywords: ["lien de paiement", "envoyer un lien de paiement", "lien de paiement par texto", "demande de paiement client", "PME Québec"],
  blocks: [
    {
      h2: "Les 5 étapes, dans l'ordre",
      ordered: [
        "Confirmez le montant avec le client avant de créer le lien : le montant exact, taxes comprises si vous êtes inscrit à la TPS et à la TVQ (voir [notre guide sur la facturation au Québec](/fr/guides/facturer-en-ligne-quebec-tps-tvq)). Un client qui découvre un montant différent de celui convenu au téléphone hésite à payer.",
        "Créez le lien : montant, devise (CAD ou USD), et une description qui reprend les mots du client, par exemple « Dépôt 30 % — rénovation de salle de bain, soumission n° 214 » plutôt que « Paiement ». Ajoutez une date d'expiration si votre prix ou votre disponibilité est limité dans le temps.",
        "Choisissez le canal selon la situation du client (tableau ci-dessous) : courriel, texto, messagerie ou code QR.",
        "Écrivez un message court qui identifie votre entreprise, le montant, l'objet du paiement et un moyen de vous joindre (modèle plus bas).",
        "Suivez le statut du lien et confirmez la réception au client. S'il ne paie pas, relancez une fois avec le même lien plutôt que d'en créer un nouveau, pour garder une seule trace du paiement.",
      ],
    },
    {
      h2: "Quel canal choisir pour envoyer le lien",
      table: {
        caption: "Canal d'envoi d'un lien de paiement selon la situation",
        head: ["Canal", "Quand l'utiliser", "Point d'attention"],
        rows: [
          ["Courriel", "Montant important, client d'affaires, besoin d'une trace écrite avec la soumission ou la facture", "Objet clair avec le nom de votre entreprise et le numéro de soumission"],
          ["Texto", "Client sur le chantier ou en déplacement, petit montant, relance rapide", "Annoncez le texto de vive voix : un lien reçu d'un numéro inconnu inquiète"],
          ["Messenger ou autre messagerie", "Le client vous a écrit par ce canal", "Gardez la conversation : c'est votre preuve de l'entente"],
          ["Code QR", "Comptoir, kiosque, événement, visite à domicile", "Affichez votre nom et le montant à côté du code"],
        ],
      },
    },
    {
      h2: "Le message à envoyer : un modèle",
      paragraphs: [
        "Le lien seul ne suffit pas. Le message autour du lien doit répondre aux trois questions que se pose le client avant de cliquer : qui m'écrit, combien, pour quoi.",
      ],
      template: {
        label: "Modèle de texto ou de courriel (à adapter)",
        text:
          "Bonjour Mme Gagnon,\nComme convenu au téléphone, voici le lien pour le dépôt de 30 % de la soumission n° 214 (rénovation de votre salle de bain) : 1 586,66 $, taxes comprises.\n[lien de paiement]\nVous pouvez payer par carte ou par virement bancaire, sans créer de compte. Le lien est valide jusqu'au 15 octobre.\nUne question ? Appelez-moi au [votre numéro habituel].\nMarc Roy, Rénovations Roy",
      },
      after: [
        "Le montant de 1 586,66 $ correspond à 30 % d'une soumission de 4 600 $ plus TPS (230 $) et TVQ (458,85 $), soit 5 288,85 $. Le calcul des taxes est détaillé dans [notre guide TPS et TVQ](/fr/guides/facturer-en-ligne-quebec-tps-tvq).",
      ],
    },
    {
      h2: "Éviter que votre lien ressemble à de l'hameçonnage",
      paragraphs: [
        "Le [Centre antifraude du Canada](https://antifraudcentre-centreantifraude.ca/scams-fraudes/phishing-hameconnage-fra.htm) décrit les tactiques des fraudeurs : adresses courriel et sites falsifiés, sentiment d'urgence, offre d'argent, demande de cliquer sur un lien ou de scanner un code QR. Votre vrai lien de paiement utilise forcément les deux dernières. Il faut donc enlever tout le reste :",
      ],
      bullets: [
        "Prévenez le client avant d'envoyer le lien (« je vous envoie le lien par texto dans cinq minutes »).",
        "Utilisez le même nom d'entreprise dans le message que sur la page de paiement.",
        "Pas d'urgence artificielle (« payez dans l'heure sinon… »). Une date d'expiration claire suffit.",
        "Ne demandez jamais un numéro de carte par courriel, texto ou téléphone : c'est le rôle de la page de paiement.",
        "Donnez un moyen de vérification que le client connaît déjà : votre numéro habituel, pas un nouveau.",
      ],
    },
    {
      h2: "Ce que dit la Loi canadienne anti-pourriel",
      paragraphs: [
        "La Loi canadienne anti-pourriel s'applique aux courriels, mais aussi aux textos et aux messageries : sa définition d'« adresse électronique » inclut les comptes de messagerie instantanée et les comptes de téléphone ([article 1](https://laws-lois.justice.gc.ca/fra/lois/E-1.6/page-1.html)).",
        "Un message qui sert uniquement à faciliter, compléter ou confirmer une opération commerciale que le client a déjà accepté de conclure avec vous n'exige pas son consentement (paragraphe 6(6)). Le message doit quand même identifier l'expéditeur, donner un moyen de le joindre et décrire un mécanisme d'exclusion (paragraphe 6(2)).",
        "Le mot important est « uniquement » : si vous ajoutez une promotion dans le même message, ce n'est plus seulement un message lié à la transaction. Gardez les offres pour un envoi séparé, à des clients qui y ont consenti.",
      ],
    },
    {
      h2: "Lien de paiement ou facture : lequel envoyer ?",
      table: {
        caption: "Choisir entre un lien de paiement et une facture",
        head: ["Situation", "Outil adapté", "Pourquoi"],
        rows: [
          ["Dépôt sur une soumission acceptée", "Lien de paiement, ou premier versement d'une facture", "Paiement rapide d'un montant connu"],
          ["Vente d'un produit ou d'un service sans boutique en ligne", "Lien de paiement ou code QR", "Pas de site web ni d'intégration à prévoir"],
          ["Travail terminé pour un client d'affaires", "Facture", "Le client inscrit a besoin de vos numéros de TPS et de TVQ pour réclamer ses crédits de taxe ([Revenu Québec](https://www.revenuquebec.ca/fr/entreprises/taxes/tpstvh-et-tvq/perception-de-la-tps-et-de-la-tvq/preparation-des-factures/))"],
          ["Gros montant étalé dans le temps", "Facture divisée en versements", "Chaque versement a sa date et son lien ([guide versements](/fr/guides/offrir-paiement-en-versements))"],
        ],
      },
    },
    {
      h2: "Les pièges fréquents",
      bullets: [
        "Une description vague (« Paiement », « Service ») : le client ne reconnaît pas l'achat sur son relevé et vous appelle, ou conteste.",
        "Un montant sans les taxes, puis un deuxième lien pour les taxes : deux paiements pour une seule vente, deux fois plus de questions.",
        "Le même lien envoyé à plusieurs clients : vous ne savez plus qui a payé quoi. Un lien par client et par vente.",
        "Aucune date d'expiration sur une offre limitée : le client paie trois mois plus tard à l'ancien prix.",
        "Pas de confirmation après le paiement : le client se demande si son paiement est passé.",
      ],
    },
    {
      h2: "Envoyer un lien de paiement avec ZeniPay",
      paragraphs: [
        "Dans ZeniPay, un lien contient le montant, la devise (CAD ou USD), la description et, si vous le voulez, une date d'expiration ; passé cette date, le lien ne fonctionne plus. La page de paiement affiche le nom et le logo de votre entreprise, et vous obtenez une adresse à copier ainsi qu'un code QR.",
        "Le client paie sans créer de compte, par carte de crédit ou de débit, ou par virement bancaire (TEF) jusqu'à 2 500 $ par transaction. Les cartes sont traitées par Finix, un processeur certifié PCI DSS niveau 1 : les numéros de carte sont saisis dans des champs sécurisés et ne passent pas par vos courriels. Pour un montant en USD, la carte est débitée en dollars canadiens et le client voit l'équivalent en CAD avant de payer. Le statut du lien (actif, payé ou expiré) se met à jour dans votre tableau de bord.",
        "L'inscription se fait en ligne ; votre entreprise doit être vérifiée avant d'accepter des paiements. Des frais de traitement s'appliquent aux paiements : écrivez à info@zeniva.ca pour connaître la tarification qui s'applique à votre entreprise. Détails sur la page [Lien de paiement](/fr/lien-de-paiement).",
      ],
    },
  ],
  faq: [
    { q: "Comment envoyer un lien de paiement par texto ?", a: "Créez le lien dans votre plateforme de paiement, copiez l'adresse et collez-la dans un texto qui donne le nom de votre entreprise, le montant et l'objet du paiement. Prévenez le client avant l'envoi : un lien reçu sans contexte ressemble à de l'hameçonnage." },
    { q: "Mon client doit-il créer un compte pour payer un lien de paiement ?", a: "Pas avec ZeniPay : le client ouvre le lien et paie par carte ou par virement bancaire, sans inscription." },
    { q: "Est-ce sécuritaire d'envoyer un lien de paiement par courriel ?", a: "Oui, si le client ne saisit son numéro de carte que sur la page de paiement et jamais dans un courriel. Chez ZeniPay, les cartes sont saisies dans des champs sécurisés fournis par Finix, un processeur certifié PCI DSS niveau 1. Annoncez l'envoi au client et utilisez le même nom d'entreprise partout pour qu'il reconnaisse le message." },
    { q: "Ai-je besoin du consentement du client pour lui envoyer un lien de paiement ?", a: "Non, si le message sert uniquement à faciliter ou à compléter une vente que le client a déjà acceptée (Loi canadienne anti-pourriel, paragraphe 6(6)). Le message doit quand même vous identifier, donner un moyen de vous joindre et un mécanisme d'exclusion (paragraphe 6(2)). Une promotion ajoutée au message change la donne." },
    { q: "Quelle est la différence entre un lien de paiement et une facture ?", a: "Le lien sert à encaisser rapidement un montant connu. La facture contient le détail du client et du travail, les taxes et vos numéros d'inscription, garde un numéro et un historique, et peut être divisée en versements." },
    { q: "Puis-je demander un dépôt avec un lien de paiement ?", a: "Oui. Créez un lien du montant du dépôt avec une description qui renvoie à la soumission (par exemple « Dépôt 30 %, soumission n° 214 »). Si le solde sera payé en plusieurs fois, une facture en versements est plus simple à suivre." },
    { q: "Combien de temps un lien de paiement reste-t-il valide ?", a: "C'est vous qui décidez. Dans ZeniPay, vous pouvez fixer une date d'expiration ; passé cette date, le lien ne fonctionne plus." },
    { q: "Un client peut-il payer un lien de paiement en dollars américains ?", a: "Avec ZeniPay, le lien peut être en CAD ou en USD. Pour un montant en USD, la carte est débitée en dollars canadiens et le client voit l'équivalent en CAD avant de payer." },
  ],
  sources: [SRC.cafcFr, SRC.lcapFr, SRC.rqFactFr, SRC.rqCalcFr],
  related: [
    { label: "Lien de paiement ZeniPay", href: "/fr/lien-de-paiement" },
    { label: "Facturer au Québec : TPS et TVQ", href: "/fr/guides/facturer-en-ligne-quebec-tps-tvq" },
    { label: "Offrir le paiement en versements", href: "/fr/guides/offrir-paiement-en-versements" },
    { label: "Frais de carte de crédit pour une PME", href: "/blog/frais-traitement-carte-credit-pme-quebec" },
    { label: "Sécurité", href: "/security" },
  ],
  cta: {
    title: "Envoyez votre premier lien de paiement",
    text: "Ouvrez votre compte d'entreprise en ligne. Une vraie personne répond à vos questions, en français ou en anglais.",
    label: "Créer mon premier lien",
    href: REGISTER,
  },
};

export const FR_GUIDE_TAXES: GuideData = {
  lang: "fr",
  path: "/fr/guides/facturer-en-ligne-quebec-tps-tvq",
  alternatePath: "/guides/quebec-invoicing-gst-qst",
  title: "Facturer en ligne au Québec : TPS, TVQ et mentions obligatoires | ZeniPay",
  description:
    "Comment calculer la TPS (5 %) et la TVQ (9,975 %), quelles mentions inscrire sur une facture selon le montant, le seuil de 30 000 $ et la règle du français, d'après Revenu Québec, l'ARC et la Charte.",
  h1: "Facturer en ligne au Québec : TPS, TVQ et mentions obligatoires",
  answer:
    "Au Québec, une entreprise inscrite ajoute à sa facture la TPS de 5 % et la TVQ de 9,975 %, chacune calculée sur le prix de vente, rédige la facture en français et y inscrit les renseignements que Revenu Québec exige selon le montant : à partir de 100 $, vos numéros d'inscription à la TPS et à la TVQ ; à partir de 500 $, aussi le nom du client et les modalités de paiement. Une facture envoyée en ligne obéit aux mêmes règles qu'une facture papier.",
  breadcrumb: "Facturer au Québec : TPS et TVQ",
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  readingMinutes: 8,
  keywords: ["facture TPS TVQ", "mentions obligatoires facture Québec", "calcul TPS TVQ", "facturation en ligne Québec", "numéro de TVQ sur facture"],
  blocks: [
    {
      h2: "Calculer la TPS et la TVQ : deux exemples",
      paragraphs: [
        "Selon [Revenu Québec](https://www.revenuquebec.ca/fr/entreprises/taxes/tpstvh-et-tvq/perception-de-la-tps-et-de-la-tvq/calcul-des-taxes/), la TPS de 5 % et la TVQ de 9,975 % s'appliquent toutes deux au prix de vente. La TVQ ne se calcule pas sur un montant qui inclut déjà la TPS. Un calcul en une seule étape au taux combiné de 14,975 % donne le même résultat.",
      ],
      table: {
        caption: "Exemples de calcul, en dollars canadiens",
        head: ["Ligne", "Contrat de 2 000 $", "Vente de 85 $"],
        rows: [
          ["Prix de vente", "2 000,00 $", "85,00 $"],
          ["TPS (5 %)", "100,00 $", "4,25 $"],
          ["TVQ (9,975 %)", "199,50 $", "8,48 $ (8,47875 $ arrondi)"],
          ["Total de la facture", "2 299,50 $", "97,73 $"],
        ],
        note: "Arrondi : seules les fractions égales ou supérieures à 0,005 $ sont arrondies au cent supérieur ; pour plusieurs articles, vous pouvez calculer les taxes sur le total avant d'arrondir. Les taux de 9,97 %, 14,97 % et 14,975 % ne doivent pas paraître sur le document qui confirme la vente ([Revenu Québec, Calcul des taxes](https://www.revenuquebec.ca/fr/entreprises/taxes/tpstvh-et-tvq/perception-de-la-tps-et-de-la-tvq/calcul-des-taxes/)).",
      },
    },
    {
      h2: "Les mentions à inscrire selon le montant de la facture",
      paragraphs: [
        "Revenu Québec n'impose pas de modèle de facture (sauf en restauration et dans le taxi). Mais vos clients inscrits ont besoin de renseignements précis pour justifier leurs crédits de taxe sur les intrants (CTI) et leurs remboursements de la taxe sur les intrants (RTI), et vous êtes tenu de les leur fournir s'ils les demandent. Le plus simple est de les mettre sur toutes vos factures.",
      ],
      table: {
        caption: "Renseignements exigés selon la valeur totale de la vente, taxes comprises (Revenu Québec)",
        head: ["Renseignement", "Moins de 100 $", "100 $ à 499,99 $", "500 $ ou plus"],
        rows: [
          ["Nom du fournisseur ou nom commercial de l'entreprise", "Requis", "Requis", "Requis"],
          ["Date de la facture", "Requis", "Requis", "Requis"],
          ["Montant total de la facture", "Requis", "Requis", "Requis"],
          ["Montant de taxe applicable", "Requis pour la TVQ seulement", "Requis", "Requis"],
          ["Numéros d'inscription à la TPS et à la TVQ du fournisseur", "Non requis", "Requis", "Requis"],
          ["Nom de l'acheteur ou de son entreprise", "Non requis", "Non requis", "Requis"],
          ["Modalités de paiement", "Non requis", "Non requis", "Requis"],
          ["Description permettant de reconnaître le bien ou le service", "Requis pour la TVQ seulement", "Requis pour la TVQ seulement", "Requis"],
        ],
        note: "Si vous indiquez un seul montant de taxe qui comprend la TPS et la TVQ, Revenu Québec demande de préciser qu'il comprend les deux taxes. Source : [Revenu Québec, Préparation des factures](https://www.revenuquebec.ca/fr/entreprises/taxes/tpstvh-et-tvq/perception-de-la-tps-et-de-la-tvq/preparation-des-factures/).",
      },
    },
    {
      h2: "Devez-vous percevoir la TPS et la TVQ ? Le seuil de 30 000 $",
      paragraphs: [
        "Vous devez vous inscrire aux fichiers de la TPS et de la TVQ si le total de vos fournitures taxables, à l'échelle mondiale et avec celles de vos associés, dépasse 30 000 $ au cours d'un trimestre civil donné ou pour l'ensemble des quatre trimestres civils qui le précèdent ([Revenu Québec, Inscription](https://www.revenuquebec.ca/fr/entreprises/taxes/tpstvh-et-tvq/inscription-aux-fichiers-de-la-tps-et-de-la-tvq/)). En dessous, vous êtes un « petit fournisseur » : vous n'avez pas à vous inscrire ni à percevoir ces taxes.",
        "Deux moments à surveiller, selon la page [Petit fournisseur](https://www.revenuquebec.ca/fr/citoyens/taxes/biens-et-services-taxables-detaxes-ou-exoneres/tps-et-tvq/autres-situations/particularites-concernant-le-petit-fournisseur/) : si vous dépassez 30 000 $ en un seul trimestre, vous perdez immédiatement ce statut et devez percevoir les taxes dès la vente qui vous fait dépasser le seuil. Si vous le dépassez sur quatre trimestres, vous cessez généralement d'être petit fournisseur à la fin du mois qui suit.",
        "Vous pouvez aussi vous inscrire volontairement pour réclamer des CTI et des RTI sur vos achats. Une entreprise qui s'inscrit au fichier de la TVQ doit aussi s'inscrire à celui de la TPS et rester inscrite au moins un an. Certaines activités, comme le taxi, obligent à s'inscrire quel que soit le montant des ventes.",
        "Au Québec, c'est Revenu Québec qui administre généralement la TPS/TVH, comme le précise l'[Agence du revenu du Canada](https://www.canada.ca/fr/agence-revenu/services/formulaires-publications/publications/rc4022/renseignements-generaux-tps-tvh-inscrits.html) : vous traitez avec un seul organisme pour les deux taxes.",
      ],
    },
    {
      h2: "La facture doit être rédigée en français",
      paragraphs: [
        "L'article 57 de la [Charte de la langue française](https://www.legisquebec.gouv.qc.ca/fr/document/lc/C-11) prévoit que « les factures, les reçus, les quittances et les autres documents de même nature sont rédigés en français ». Il ajoute que nul ne peut transmettre un tel document dans une autre langue lorsque sa version française n'est pas accessible au destinataire dans des conditions au moins aussi favorables.",
        "En pratique : une facture bilingue, ou une facture en français accompagnée d'une version anglaise, convient à un client anglophone. Une facture uniquement en anglais ne convient pas. La règle vise aussi les reçus de paiement envoyés par courriel.",
      ],
    },
    {
      h2: "Ce que votre outil de facturation en ligne doit afficher",
      bullets: [
        "La TPS et la TVQ sur deux lignes distinctes, ou un seul montant accompagné de la mention qu'il comprend les deux taxes.",
        "Vos numéros d'inscription à la TPS et à la TVQ, dès que la facture atteint 100 $.",
        "Le nom du client et les modalités de paiement (« payable à la réception », « 30 % à la signature, solde à la livraison ») dès 500 $.",
        "Une description qui permet de reconnaître le bien ou le service, et la date de la facture.",
        "Un texte en français, y compris dans le courriel d'envoi et le reçu.",
        "Un numéro de facture unique : ce n'est pas dans le tableau de Revenu Québec, mais c'est ce qui permet de retrouver une facture et son paiement.",
      ],
    },
    {
      h2: "Combien de temps garder vos factures",
      paragraphs: [
        "Revenu Québec demande de conserver vos registres et pièces justificatives pendant les six années qui suivent la fin de la dernière année à laquelle ils se rapportent, plus longtemps en cas d'opposition ou de contestation. Ils peuvent être conservés sur support électronique, à condition de pouvoir produire des copies accessibles et utilisables ([Revenu Québec, Tenue de registres](https://www.revenuquebec.ca/fr/entreprises/taxes/tpstvh-et-tvq/regles-de-base-relatives-a-lapplication-de-la-tpstvh-et-de-la-tvq/tenue-de-registres-et-pieces-justificatives/)).",
      ],
    },
    {
      h2: "Les pièges fréquents",
      bullets: [
        "Calculer la TVQ sur le prix qui inclut déjà la TPS : elle se calcule sur le prix de vente.",
        "Afficher « Taxes 14,975 % » sur la facture : ce taux ne doit pas paraître sur le document de vente.",
        "Oublier vos numéros d'inscription sur une facture de 100 $ ou plus : votre client d'affaires ne pourra pas justifier ses CTI et RTI et vous demandera une nouvelle facture.",
        "Envoyer la facture seulement en anglais à un client du Québec.",
        "Dépasser 30 000 $ en un trimestre sans s'en rendre compte : les taxes sont dues dès la vente qui fait dépasser le seuil, même si vous ne les avez pas facturées.",
        "Diviser une facture en versements sans préciser les modalités de paiement sur la facture : à 500 $ ou plus, elles font partie des renseignements exigés. Pour le moment où la taxe devient payable sur un dépôt ou des versements, vérifiez avec votre comptable ou Revenu Québec.",
      ],
    },
    {
      h2: "Facturer en ligne avec ZeniPay",
      paragraphs: [
        "Avec ZeniPay, la facture part par courriel avec un bouton « Payer », au nom de votre entreprise. Le client paie par carte ou par virement bancaire (TEF, jusqu'à 2 500 $ par transaction) ; la facture passe à « payée » automatiquement et le reçu part au client. Les factures peuvent être en CAD ou en USD, et les courriels de facture sont rédigés en français, avec une ligne en anglais pour les clients anglophones.",
        "Une facture peut aussi être divisée en dépôt et versements (de 2 à 12), chacun avec son propre lien. Avant d'envoyer votre première facture, vérifiez dans l'aperçu que les renseignements du tableau ci-dessus y figurent ; pour toute question sur l'affichage des taxes, écrivez à info@zeniva.ca. Détails sur la page [Facturation en ligne](/fr/facturation-en-ligne).",
      ],
    },
  ],
  faq: [
    { q: "Quel est le taux de la TPS et de la TVQ au Québec en 2026 ?", a: "La TPS est de 5 % et la TVQ de 9,975 %, toutes deux calculées sur le prix de vente, selon la page Calcul des taxes de Revenu Québec consultée le 2 octobre 2026. Ensemble, elles représentent 14,975 % du prix." },
    { q: "Comment calculer la TPS et la TVQ sur une facture ?", a: "Multipliez le prix de vente par 5 % pour la TPS et par 9,975 % pour la TVQ, puis additionnez. Sur 2 000 $ : 100 $ de TPS, 199,50 $ de TVQ, total 2 299,50 $. Arrondissez au cent seulement les fractions de 0,005 $ et plus." },
    { q: "Dois-je charger la TPS et la TVQ si je fais moins de 30 000 $ par année ?", a: "Non, si vos fournitures taxables ne dépassent pas 30 000 $ au cours d'un trimestre civil ni sur les quatre trimestres précédents : vous êtes un petit fournisseur. Vous pouvez toutefois vous inscrire volontairement, et certaines activités, comme le taxi, obligent à s'inscrire." },
    { q: "Quelles sont les mentions obligatoires sur une facture au Québec ?", a: "Selon Revenu Québec, toujours : le nom de l'entreprise, la date et le montant total. Dès 100 $ : le montant de taxe et vos numéros de TPS et de TVQ. Dès 500 $ : aussi le nom du client, les modalités de paiement et la description du bien ou du service. La facture doit être rédigée en français (Charte, art. 57)." },
    { q: "Une facture peut-elle être seulement en anglais au Québec ?", a: "Non. L'article 57 de la Charte de la langue française exige que les factures et les reçus soient rédigés en français. Une facture bilingue, ou une version anglaise remise en plus de la version française, est possible." },
    { q: "Faut-il mettre le numéro de TVQ sur une facture de moins de 100 $ ?", a: "Ce n'est pas exigé par Revenu Québec sous 100 $, taxes comprises. Le montant de TVQ et la description doivent toutefois y figurer. Plusieurs entreprises l'indiquent quand même sur toutes leurs factures pour simplifier." },
    { q: "Combien de temps dois-je garder mes factures ?", a: "Six ans après la fin de la dernière année à laquelle elles se rapportent, selon Revenu Québec, et plus longtemps en cas d'opposition ou d'appel." },
    { q: "Une facture envoyée par courriel est-elle valide ?", a: "Oui. Revenu Québec accepte les registres et pièces justificatives sur support électronique, à condition de pouvoir en produire des copies accessibles et utilisables. Les mêmes renseignements que sur une facture papier doivent y figurer." },
  ],
  sources: [SRC.rqCalcFr, SRC.rqFactFr, SRC.rqInscFr, SRC.rqPetitFr, SRC.rqRegFr, SRC.arcFr, SRC.charteFr],
  related: [
    { label: "Facturation en ligne ZeniPay", href: "/fr/facturation-en-ligne" },
    { label: "Envoyer un lien de paiement", href: "/fr/guides/envoyer-lien-de-paiement-client" },
    { label: "Offrir le paiement en versements", href: "/fr/guides/offrir-paiement-en-versements" },
    { label: "Frais de carte de crédit pour une PME", href: "/blog/frais-traitement-carte-credit-pme-quebec" },
  ],
  cta: {
    title: "Envoyez une facture qui se paie en ligne",
    text: "Ouvrez votre compte d'entreprise, ou écrivez-nous pour vérifier que votre facture affiche ce dont vos clients ont besoin.",
    label: "Envoyer ma première facture",
    href: REGISTER,
  },
};

export const FR_GUIDE_INSTALLMENTS: GuideData = {
  lang: "fr",
  path: "/fr/guides/offrir-paiement-en-versements",
  alternatePath: "/guides/offering-installment-payments",
  title: "Offrir le paiement en versements à ses clients : options et pièges | ZeniPay",
  description:
    "Facture divisée, « achetez maintenant, payez plus tard » ou vente à tempérament : les trois façons d'offrir le paiement en plusieurs fois au Québec, qui porte le risque, et quand la Loi sur la protection du consommateur s'applique.",
  h1: "Offrir le paiement en versements à ses clients : options et pièges",
  answer:
    "Une PME peut offrir le paiement en versements de trois façons : diviser elle-même sa facture en dépôt et versements sans intérêts ni frais (elle accorde le délai et garde le risque), passer par un service « achetez maintenant, payez plus tard » où le client finance son achat à crédit auprès d'un tiers, ou conclure un contrat de crédit comme la vente à tempérament, encadrée au Québec par la Loi sur la protection du consommateur. Le piège principal : ajouter des frais, des intérêts ou un rabais au comptant peut transformer une simple facture en contrat de crédit.",
  breadcrumb: "Offrir le paiement en versements",
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  readingMinutes: 8,
  keywords: ["paiement en versements", "payer en plusieurs fois PME", "dépôt et versements", "achetez maintenant payez plus tard", "vente à tempérament Québec"],
  blocks: [
    {
      h2: "Les trois options, côte à côte",
      table: {
        caption: "Comparaison des façons d'offrir le paiement en plusieurs fois",
        head: ["Option", "Qui accorde le délai", "Ce que le client signe", "Qui porte le risque de non-paiement"],
        rows: [
          ["Facture divisée en versements, sans frais de crédit", "Vous", "Votre soumission ou votre facture, avec les dates et montants", "Vous"],
          ["« Achetez maintenant, payez plus tard »", "Un fournisseur de services financiers", "Deux ententes : une avec vous pour l'achat, une avec le fournisseur pour le financement ([ACFC](https://www.canada.ca/fr/agence-consommation-matiere-financiere/services/prets/achetez-maintenant-payez-tard.html))", "Selon votre contrat avec le fournisseur"],
          ["Vente à tempérament (contrat de crédit)", "Vous, puis généralement une institution financière à qui le contrat est cédé ([OPC](https://www.opc.gouv.qc.ca/commercant/secteur/credit/vente-temperament/definition))", "Un contrat de crédit écrit", "Vous ou l'institution à qui le contrat est cédé"],
        ],
      },
    },
    {
      h2: "Option 1 : diviser votre facture en dépôt et versements",
      paragraphs: [
        "C'est la formule des entrepreneurs, des formateurs, des organisateurs d'événements et des voyages de groupe : un dépôt à la signature, puis des versements à des dates convenues. Il n'y a pas de prêteur ni de vérification de crédit ; vous faites confiance au client, comme pour une facture payable à 30 jours.",
        "Exemple sur une soumission de 4 600 $ plus taxes : TPS de 230 $ et TVQ de 458,85 $, soit 5 288,85 $ (calcul détaillé dans [notre guide TPS et TVQ](/fr/guides/facturer-en-ligne-quebec-tps-tvq)).",
      ],
      table: {
        caption: "Calendrier type 30 / 30 / 40 sur 5 288,85 $",
        head: ["Versement", "Date", "Montant"],
        rows: [
          ["Dépôt (30 %)", "À la signature", "1 586,66 $"],
          ["Deuxième versement (30 %)", "Début des travaux", "1 586,66 $"],
          ["Solde (40 %)", "À la fin des travaux", "2 115,53 $"],
          ["Total", "", "5 288,85 $"],
        ],
        note: "Le dernier versement absorbe l'arrondi pour que le total corresponde exactement à la facture.",
      },
      after: [
        "Écrivez ce calendrier dans la soumission que le client accepte, puis sur la facture : à 500 $ ou plus, les modalités de paiement font partie des renseignements que Revenu Québec demande sur la facture ([Préparation des factures](https://www.revenuquebec.ca/fr/entreprises/taxes/tpstvh-et-tvq/perception-de-la-tps-et-de-la-tvq/preparation-des-factures/)).",
      ],
    },
    {
      h2: "Le piège principal : créer un contrat de crédit sans le savoir",
      paragraphs: [
        "Tant que le client paie le même prix, en plusieurs fois, sans frais ajoutés, vous lui accordez simplement un délai. Dès que le paiement en versements coûte plus cher que le paiement comptant, la question des frais de crédit se pose.",
        "Dans sa section sur la vente à tempérament, l'[Office de la protection du consommateur](https://www.opc.gouv.qc.ca/commercant/secteur/credit/vente-temperament/paiements) énumère comme frais de crédit, notamment : les intérêts, les frais d'administration, les frais d'adhésion ou de renouvellement, la commission, et la valeur du rabais ou de l'escompte auquel le consommateur a droit s'il paie comptant. Un « 5 % de rabais si vous payez tout d'un coup » peut donc faire entrer votre offre dans les règles du crédit.",
        "Pour la vente à tempérament, l'OPC précise aussi que le commerçant doit évaluer la capacité du consommateur à rembourser avant de conclure le contrat, faute de quoi il perd son droit aux frais de crédit et doit rembourser ceux déjà payés ([évaluation préalable](https://www.opc.gouv.qc.ca/commercant/secteur/credit/vente-temperament/contrat/evaluation-prealable)). Si vous voulez ajouter des frais, des intérêts ou un rabais au comptant, vérifiez d'abord auprès de l'OPC ou d'un avocat.",
      ],
    },
    {
      h2: "Option 2 : « achetez maintenant, payez plus tard »",
      paragraphs: [
        "Avec ce type de plan, rappelle l'[Agence de la consommation en matière financière du Canada](https://www.canada.ca/fr/agence-consommation-matiere-financiere/services/prets/achetez-maintenant-payez-tard.html), le client finance son achat à crédit, et s'il ne fait pas ses paiements à temps, il devra habituellement payer des frais. Il conclut une entente avec vous pour l'achat et une autre avec le fournisseur de services financiers pour le financement.",
        "Pour vous, la formule a l'avantage de vous faire payer par le fournisseur plutôt que par le client. Avant de signer, demandez par écrit : les frais facturés au commerçant pour chaque vente, le délai de versement des fonds, le traitement des retours et des remboursements, et qui répond au client en cas de différend sur un versement.",
      ],
    },
    {
      h2: "Option 3 : la vente à tempérament",
      paragraphs: [
        "Selon l'[OPC](https://www.opc.gouv.qc.ca/commercant/secteur/credit/vente-temperament/definition), le contrat de vente à tempérament est un contrat de vente à crédit : le commerçant finance le bien, cède généralement le contrat à une institution financière, et demeure propriétaire du bien (ou l'institution à qui le contrat est cédé) jusqu'à ce que le consommateur ait payé la totalité du prix et des frais de crédit.",
        "Cette formule vise surtout les biens de valeur et entraîne des obligations précises : contrat écrit, évaluation préalable de la capacité de rembourser, état de compte sur demande. Pour un service payé en quelques versements sans frais, l'option 1 est presque toujours plus simple.",
      ],
    },
    {
      h2: "Les autres pièges fréquents",
      bullets: [
        "Commencer le travail sans dépôt : faites du premier versement un paiement exigible à la signature.",
        "Des dates floues (« le solde plus tard ») : chaque versement doit avoir une date et un montant écrits.",
        "Relancer à la main : sans rappel automatique, un versement oublié devient une dette qu'on hésite à réclamer.",
        "Des frais de paiement refusé improvisés : dans le cas de la vente à tempérament, l'OPC limite les frais réclamés pour un chèque sans provision ou un virement refusé à ceux que l'institution financière vous a exigés.",
        "Un dernier versement plus élevé que ce que le client peut payer d'un coup par virement : chez ZeniPay, le virement bancaire est limité à 2 500 $ par transaction ; au-delà, le client paie par carte ou vous découpez autrement.",
      ],
    },
    {
      h2: "Le paiement en versements avec ZeniPay",
      paragraphs: [
        "ZeniPay sert l'option 1. Vous choisissez de 2 à 12 versements par facture, en montant ou en pourcentage, avec une date pour chacun. Les versements dus aujourd'hui partent tout de suite par courriel ; les autres partent automatiquement à leur date, chacun avec son propre lien de paiement par carte ou par virement bancaire.",
        "Un rappel part 3 jours puis 7 jours après l'échéance d'un versement impayé, un reçu part dès qu'il est payé, et la facture passe de « partiellement payée » à « payée » au dernier versement. Vous pouvez renvoyer ou annuler un versement depuis le tableau de bord.",
        "ZeniPay ne prête pas d'argent, ne fait pas de vérification de crédit et ne facture pas d'intérêts au client : c'est vous qui accordez le délai, et le risque de non-paiement reste le vôtre, d'où l'intérêt d'un dépôt. Détails sur la page [Paiement en versements](/fr/paiement-en-versements).",
      ],
    },
  ],
  faq: [
    { q: "Comment offrir le paiement en plusieurs fois sans passer par une compagnie de financement ?", a: "Divisez votre facture en un dépôt et des versements à des dates précises, au même prix qu'un paiement comptant et sans frais ajoutés. Écrivez le calendrier dans la soumission acceptée et envoyez chaque versement avec son lien de paiement à sa date." },
    { q: "Puis-je charger des intérêts ou des frais sur un paiement en versements ?", a: "Si vous ajoutez des intérêts ou des frais, votre entente peut devenir un contrat de crédit encadré par la Loi sur la protection du consommateur, avec des obligations précises. Vérifiez auprès de l'Office de la protection du consommateur ou d'un avocat avant de le faire." },
    { q: "Puis-je offrir un rabais aux clients qui paient comptant ?", a: "Prudence : dans sa section sur la vente à tempérament, l'OPC compte la valeur du rabais ou de l'escompte offert au paiement comptant parmi les frais de crédit. Un prix plus élevé en versements qu'au comptant peut donc faire entrer votre offre dans les règles du crédit." },
    { q: "Quelle est la différence entre le paiement en versements et « achetez maintenant, payez plus tard » ?", a: "Avec une facture en versements, c'est vous qui accordez le délai et vous êtes payé par le client au fil des versements. Avec un plan « achetez maintenant, payez plus tard », le client finance son achat à crédit auprès d'un fournisseur de services financiers, avec qui il signe une entente distincte." },
    { q: "Que faire si un client ne paie pas un versement ?", a: "Relancez rapidement avec le même lien. Dans ZeniPay, un rappel part automatiquement 3 jours puis 7 jours après l'échéance, et vous voyez dans le tableau de bord quels versements sont en retard. Si le retard persiste, appelez le client avant d'aller plus loin." },
    { q: "Combien de versements offrir ?", a: "Assez pour rendre le montant abordable, pas plus que la durée du travail ou du service. Pour un contrat de quelques semaines, un dépôt et deux versements suffisent souvent. ZeniPay permet de 2 à 12 versements par facture." },
    { q: "Comment calculer les taxes sur une facture payée en versements ?", a: "Calculez la TPS (5 %) et la TVQ (9,975 %) sur le prix total, puis répartissez le total taxes comprises entre les versements. Sur 4 600 $ plus taxes (5 288,85 $), un calendrier 30 / 30 / 40 donne 1 586,66 $, 1 586,66 $ et 2 115,53 $." },
  ],
  sources: [SRC.opcDefFr, SRC.opcEvalFr, SRC.opcPayFr, SRC.acfcFr, SRC.rqFactFr, SRC.rqCalcFr],
  related: [
    { label: "Paiement en versements ZeniPay", href: "/fr/paiement-en-versements" },
    { label: "Facturer au Québec : TPS et TVQ", href: "/fr/guides/facturer-en-ligne-quebec-tps-tvq" },
    { label: "Envoyer un lien de paiement", href: "/fr/guides/envoyer-lien-de-paiement-client" },
    { label: "Facturation en ligne", href: "/fr/facturation-en-ligne" },
  ],
  cta: {
    title: "Divisez votre prochaine facture en versements",
    text: "Dépôt aujourd'hui, solde à ses dates, rappels automatiques. Ouvrez votre compte d'entreprise ou posez-nous vos questions.",
    label: "Créer une facture en versements",
    href: REGISTER,
  },
};

// ─── EN ─────────────────────────────────────────────────────────────────────

export const EN_GUIDE_PAYLINK: GuideData = {
  lang: "en",
  path: "/guides/how-to-send-a-payment-link",
  alternatePath: "/fr/guides/envoyer-lien-de-paiement-client",
  title: "How to send a payment link to a customer (email, text, QR) | ZeniPay",
  description:
    "The 5 steps to send a payment link to a customer in Canada: what to write, which channel to use, how to keep it from looking like phishing, and what Canada's Anti-Spam Legislation says.",
  h1: "How to send a payment link to a customer",
  answer:
    "To send a payment link to a customer, create the link in your payment platform (amount, currency, description), then paste it into an email or text that says who you are, what the customer is paying for and until when; the customer clicks, pays by card or bank transfer, and you see the payment in your dashboard. The rest of this guide covers what makes the difference: the message, the channel and trust.",
  breadcrumb: "Send a payment link",
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  readingMinutes: 6,
  keywords: ["payment link", "send a payment link", "payment link by text", "request payment from customer", "small business Canada"],
  blocks: [
    {
      h2: "The 5 steps, in order",
      ordered: [
        "Confirm the amount with the customer before creating the link: the exact amount, including tax if you are registered for GST and QST (see [our Québec invoicing guide](/guides/quebec-invoicing-gst-qst)). A customer who sees a different number from the one agreed on the phone hesitates.",
        "Create the link: amount, currency (CAD or USD), and a description in the customer's own words, such as \"30% deposit, bathroom renovation, quote #214\" rather than \"Payment\". Add an expiry date if your price or availability is time-limited.",
        "Pick the channel that fits the customer's situation (table below): email, text, messaging app or QR code.",
        "Write a short message that names your business, the amount, what it is for and how to reach you (template below).",
        "Track the link status and confirm receipt to the customer. If they do not pay, follow up once with the same link rather than creating a new one, so the payment has a single trail.",
      ],
    },
    {
      h2: "Which channel to send the link through",
      table: {
        caption: "Payment link channel by situation",
        head: ["Channel", "When to use it", "Watch out for"],
        rows: [
          ["Email", "Larger amounts, business customers, a written trail with the quote or invoice", "A clear subject line with your business name and quote number"],
          ["Text message", "Customer on site or on the road, small amount, quick follow-up", "Say it out loud first: a link from an unknown number is alarming"],
          ["Messenger or another app", "The customer contacted you there", "Keep the conversation: it is your record of the agreement"],
          ["QR code", "Counter, booth, event, home visit", "Show your name and the amount next to the code"],
        ],
      },
    },
    {
      h2: "The message to send: a template",
      paragraphs: [
        "The link alone is not enough. The message around it should answer the three questions a customer asks before clicking: who is writing, how much, and for what.",
      ],
      template: {
        label: "Text or email template (adapt as needed)",
        text:
          "Hi Ms. Gagnon,\nAs discussed on the phone, here is the link for the 30% deposit on quote #214 (your bathroom renovation): $1,586.66, tax included.\n[payment link]\nYou can pay by card or bank transfer, no account needed. The link is valid until October 15.\nQuestions? Call me at [your usual number].\nMarc Roy, Roy Renovations",
      },
      after: [
        "$1,586.66 is 30% of a $4,600 quote plus GST ($230) and QST ($458.85), for a total of $5,288.85. The tax calculation is explained in [our GST and QST guide](/guides/quebec-invoicing-gst-qst).",
      ],
    },
    {
      h2: "Keep your link from looking like phishing",
      paragraphs: [
        "The [Canadian Anti-Fraud Centre](https://antifraudcentre-centreantifraude.ca/scams-fraudes/phishing-hameconnage-eng.htm) lists the tactics fraudsters use: spoofed email addresses and websites, a sense of urgency, offers of money, and requests to click a link or scan a QR code. A real payment link necessarily uses the last two, so remove everything else:",
      ],
      bullets: [
        "Tell the customer before you send it (\"I'll text you the link in five minutes\").",
        "Use the same business name in the message as on the payment page.",
        "No artificial urgency (\"pay within the hour or...\"). A clear expiry date is enough.",
        "Never ask for a card number by email, text or phone: that is what the payment page is for.",
        "Give the customer a way to check that they already know: your usual phone number, not a new one.",
      ],
    },
    {
      h2: "What Canada's Anti-Spam Legislation says",
      paragraphs: [
        "CASL covers email, but also text messages and messaging apps: its definition of \"electronic address\" includes instant messaging accounts and telephone accounts ([section 1](https://laws-lois.justice.gc.ca/eng/acts/E-1.6/page-1.html)).",
        "A message that solely facilitates, completes or confirms a commercial transaction the customer previously agreed to enter into with you does not require their consent (subsection 6(6)). It must still identify the sender, give a way to contact them and set out an unsubscribe mechanism (subsection 6(2)).",
        "The key word is \"solely\": add a promotion to the same message and it is no longer only about the transaction. Keep offers for a separate message to customers who agreed to receive them.",
      ],
    },
    {
      h2: "Payment link or invoice: which one to send?",
      table: {
        caption: "Choosing between a payment link and an invoice",
        head: ["Situation", "Right tool", "Why"],
        rows: [
          ["Deposit on an accepted quote", "Payment link, or first installment of an invoice", "Fast payment of a known amount"],
          ["Selling a product or service without an online store", "Payment link or QR code", "No website or integration needed"],
          ["Finished work for a business customer", "Invoice", "A registered customer needs your GST and QST numbers to claim input tax credits ([Revenu Québec](https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/collecting-gst-and-qst/preparing-invoices/))"],
          ["Large amount paid over time", "Invoice split into installments", "Each installment has its own date and link ([installments guide](/guides/offering-installment-payments))"],
        ],
      },
    },
    {
      h2: "Common mistakes",
      bullets: [
        "A vague description (\"Payment\", \"Service\"): the customer does not recognize the charge on their statement and calls you, or disputes it.",
        "An amount without tax, then a second link for the tax: two payments for one sale, twice the questions.",
        "The same link sent to several customers: you lose track of who paid what. One link per customer and per sale.",
        "No expiry date on a limited offer: the customer pays three months later at the old price.",
        "No confirmation after payment: the customer wonders whether it went through.",
      ],
    },
    {
      h2: "Sending a payment link with ZeniPay",
      paragraphs: [
        "In ZeniPay, a link holds the amount, the currency (CAD or USD), the description and, if you want, an expiry date; after that date the link stops working. The payment page shows your business name and logo, and you get a URL to copy and a QR code.",
        "The customer pays without creating an account, by credit or debit card, or by bank transfer (EFT) up to $2,500 per transaction. Cards are processed by Finix, a PCI DSS Level 1 processor: card numbers are entered in secure fields and never pass through your email. For a USD amount, the card is charged in Canadian dollars and the customer sees the CAD equivalent before paying. The link status (active, paid or expired) updates in your dashboard.",
        "Sign-up is online; your business must be verified before it can accept payments. Processing fees apply per payment: write to info@zeniva.ca for the pricing that applies to your business. Details on the [Payment links](/paylinks) page.",
      ],
    },
  ],
  faq: [
    { q: "How do I send a payment link by text message?", a: "Create the link in your payment platform, copy the URL and paste it into a text that gives your business name, the amount and what it is for. Tell the customer before sending it: a link with no context looks like phishing." },
    { q: "Does my customer need an account to pay a payment link?", a: "Not with ZeniPay: the customer opens the link and pays by card or bank transfer, without signing up." },
    { q: "Is it safe to send a payment link by email?", a: "Yes, as long as the customer only enters their card number on the payment page and never in an email. At ZeniPay, cards are entered in secure fields provided by Finix, a PCI DSS Level 1 processor. Announce the message and use the same business name everywhere so the customer recognizes it." },
    { q: "Do I need the customer's consent to email them a payment link?", a: "No, if the message solely facilitates or completes a sale the customer already agreed to (CASL, subsection 6(6)). It must still identify you, give a way to reach you and include an unsubscribe mechanism (subsection 6(2)). Adding a promotion changes that." },
    { q: "What is the difference between a payment link and an invoice?", a: "A link collects a known amount quickly. An invoice carries the customer and job details, the taxes and your registration numbers, keeps a number and a history, and can be split into installments." },
    { q: "Can I ask for a deposit with a payment link?", a: "Yes. Create a link for the deposit amount with a description that refers to the quote (for example \"30% deposit, quote #214\"). If the balance will be paid in several parts, an installment invoice is easier to track." },
    { q: "How long is a payment link valid?", a: "You decide. In ZeniPay you can set an expiry date; after that date the link stops working." },
    { q: "Can a customer pay a payment link in US dollars?", a: "With ZeniPay the link can be in CAD or USD. For a USD amount, the card is charged in Canadian dollars and the customer sees the CAD equivalent before paying." },
  ],
  sources: [SRC.cafcEn, SRC.caslEn, SRC.rqFactEn, SRC.rqCalcEn],
  related: [
    { label: "ZeniPay payment links", href: "/paylinks" },
    { label: "Québec invoicing: GST and QST", href: "/guides/quebec-invoicing-gst-qst" },
    { label: "Offering installment payments", href: "/guides/offering-installment-payments" },
    { label: "Security", href: "/security" },
  ],
  cta: {
    title: "Send your first payment link",
    text: "Open your business account online. A real person answers your questions, in English or French.",
    label: "Create my first link",
    href: REGISTER,
  },
};

export const EN_GUIDE_TAXES: GuideData = {
  lang: "en",
  path: "/guides/quebec-invoicing-gst-qst",
  alternatePath: "/fr/guides/facturer-en-ligne-quebec-tps-tvq",
  title: "Invoicing online in Québec: GST, QST and required information | ZeniPay",
  description:
    "How to calculate GST (5%) and QST (9.975%), what to show on an invoice depending on the amount, the $30,000 threshold and the French-language rule, from Revenu Québec, the CRA and the Charter.",
  h1: "Invoicing online in Québec: GST, QST and required information",
  answer:
    "In Québec, a registered business adds 5% GST and 9.975% QST to its invoice, each calculated on the sale price, drafts the invoice in French, and shows the information Revenu Québec requires for the amount: from $100, your GST and QST registration numbers; from $500, also the customer's name and the payment terms. An invoice sent online follows the same rules as a paper one.",
  breadcrumb: "Québec invoicing: GST and QST",
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  readingMinutes: 8,
  keywords: ["GST QST invoice", "Quebec invoice requirements", "calculate GST QST", "online invoicing Quebec", "QST number on invoice"],
  blocks: [
    {
      h2: "Calculating GST and QST: two examples",
      paragraphs: [
        "According to [Revenu Québec](https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/collecting-gst-and-qst/calculating-the-taxes/), 5% GST and 9.975% QST both apply to the sale price. QST is not calculated on an amount that already includes GST. A one-step calculation at the combined 14.975% rate gives the same result.",
      ],
      table: {
        caption: "Worked examples, in Canadian dollars",
        head: ["Line", "$2,000 contract", "$85 sale"],
        rows: [
          ["Sale price", "$2,000.00", "$85.00"],
          ["GST (5%)", "$100.00", "$4.25"],
          ["QST (9.975%)", "$199.50", "$8.48 ($8.47875 rounded)"],
          ["Invoice total", "$2,299.50", "$97.73"],
        ],
        note: "Rounding: only fractions of $0.005 or more are rounded up to the next cent; for several items you can calculate the taxes on the total before rounding. The 9.97%, 14.97% and 14.975% rates must not appear on the document attesting to the sale ([Revenu Québec, Calculating the Taxes](https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/collecting-gst-and-qst/calculating-the-taxes/)).",
      },
    },
    {
      h2: "What to show on the invoice, by amount",
      paragraphs: [
        "Revenu Québec does not impose an invoice format (except for restaurants and taxis). But your registered customers need specific information to support their input tax credits (ITCs) and input tax refunds (ITRs), and you must provide it in writing if they ask. The simplest approach is to put it on every invoice.",
      ],
      table: {
        caption: "Required information by total value of the sale, taxes included (Revenu Québec)",
        head: ["Information", "Less than $100", "$100 to $499.99", "$500 or more"],
        rows: [
          ["Supplier's name or business name", "Required", "Required", "Required"],
          ["Invoice date", "Required", "Required", "Required"],
          ["Total amount of the invoice", "Required", "Required", "Required"],
          ["Amount of applicable tax", "Required for the QST only", "Required", "Required"],
          ["Supplier's GST and QST registration numbers", "Not required", "Required", "Required"],
          ["Purchaser's name or business name", "Not required", "Not required", "Required"],
          ["Payment terms", "Not required", "Not required", "Required"],
          ["Description identifying the property or service", "Required for the QST only", "Required for the QST only", "Required"],
        ],
        note: "If you show a single tax amount that includes both GST and QST, Revenu Québec asks you to state that it includes both. Source: [Revenu Québec, Preparing Invoices](https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/collecting-gst-and-qst/preparing-invoices/).",
      },
    },
    {
      h2: "Do you have to charge GST and QST? The $30,000 threshold",
      paragraphs: [
        "You are a small supplier if the taxable supplies made worldwide by you and your associates do not exceed $30,000 in a given calendar quarter or in the four preceding calendar quarters. A small supplier does not have to register for or collect GST/HST and QST ([Revenu Québec, Small Suppliers](https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/registering-for-the-gst-and-qst/small-suppliers/)).",
        "Two moments to watch: if you exceed $30,000 in a single quarter, you stop being a small supplier immediately and must collect tax on the sale that takes you over the limit and on every sale after it. If you exceed it over four quarters, you generally stop being a small supplier at the end of the following calendar month.",
        "You can also register voluntarily to claim ITCs and ITRs on your purchases. Some activities, such as operating a taxi business, require registration regardless of sales ([Revenu Québec, Registering](https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/registering-for-the-gst-and-qst/)).",
        "In Québec, Revenu Québec generally administers the GST/HST, as the [Canada Revenue Agency](https://www.canada.ca/en/revenue-agency/services/forms-publications/publications/rc4022/general-information-gst-hst-registrants.html) notes: you deal with one agency for both taxes.",
      ],
    },
    {
      h2: "The invoice must be drawn up in French",
      paragraphs: [
        "Section 57 of the [Charter of the French Language](https://www.legisquebec.gouv.qc.ca/en/document/cs/C-11) states that \"invoices, receipts, acquittances and other documents of the same nature must be drawn up in French.\" It adds that \"no person may send such a document in a language other than French if the French version is not available to the recipient on terms that are at least as favourable.\"",
        "In practice: a bilingual invoice, or a French invoice with an English version, works for an English-speaking customer. An English-only invoice does not. The rule also covers payment receipts sent by email.",
      ],
    },
    {
      h2: "What your online invoicing tool should show",
      bullets: [
        "GST and QST on two separate lines, or a single amount with a statement that it includes both taxes.",
        "Your GST and QST registration numbers once the invoice reaches $100.",
        "The customer's name and the payment terms (\"due on receipt\", \"30% on signing, balance on delivery\") from $500.",
        "A description that identifies the goods or service, and the invoice date.",
        "French text, including the email that carries the invoice and the receipt.",
        "A unique invoice number: it is not in Revenu Québec's table, but it is how you match an invoice to its payment.",
      ],
    },
    {
      h2: "How long to keep your invoices",
      paragraphs: [
        "Revenu Québec requires you to keep registers and supporting documents for six years after the end of the last year to which they apply, and longer if you object to an assessment or appeal ([Revenu Québec, Keeping registers](https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/basic-rules-for-applying-the-gsthst-and-qst/keeping-registers-and-supporting-documents/)). Electronic records are accepted if they can produce accessible, usable copies.",
      ],
    },
    {
      h2: "Common mistakes",
      bullets: [
        "Calculating QST on a price that already includes GST: it is calculated on the sale price.",
        "Printing \"Taxes 14.975%\" on the invoice: that rate must not appear on the sales document.",
        "Leaving your registration numbers off an invoice of $100 or more: your business customer cannot support their ITCs and ITRs and will ask for a new invoice.",
        "Sending an English-only invoice to a Québec customer.",
        "Crossing $30,000 in one quarter without noticing: tax is owed from the sale that crosses the threshold, even if you did not charge it.",
        "Splitting an invoice into installments without stating the payment terms on it: at $500 or more they are required information. For when tax becomes payable on a deposit or installments, check with your accountant or Revenu Québec.",
      ],
    },
    {
      h2: "Invoicing online with ZeniPay",
      paragraphs: [
        "With ZeniPay, the invoice is emailed with a Pay button under your business name. The customer pays by card or bank transfer (EFT, up to $2,500 per transaction); the invoice is marked paid automatically and a receipt is sent. Invoices can be in CAD or USD, and invoice emails are written in French with a line in English for English-speaking customers.",
        "An invoice can also be split into a deposit and 2 to 12 installments, each with its own link. Before sending your first invoice, check in the preview that the information in the table above is there; for any question about how taxes are displayed, write to info@zeniva.ca. Details on the [Online invoicing](/invoices) page.",
      ],
    },
  ],
  faq: [
    { q: "What are the GST and QST rates in Québec in 2026?", a: "GST is 5% and QST is 9.975%, both calculated on the sale price, according to Revenu Québec's Calculating the Taxes page as viewed on October 2, 2026. Together they add 14.975% to the price." },
    { q: "How do I calculate GST and QST on an invoice?", a: "Multiply the sale price by 5% for GST and by 9.975% for QST, then add both. On $2,000: $100 GST, $199.50 QST, $2,299.50 total. Only fractions of $0.005 or more are rounded up to the next cent." },
    { q: "Do I have to charge GST and QST if I make less than $30,000 a year?", a: "No, if your taxable supplies do not exceed $30,000 in a calendar quarter or over the four preceding quarters: you are a small supplier. You can still register voluntarily, and some activities, such as taxis, must register regardless." },
    { q: "What information is required on an invoice in Québec?", a: "According to Revenu Québec, always: the business name, the date and the total. From $100: the tax amount and your GST and QST numbers. From $500: also the customer's name, the payment terms and a description of the goods or service. The invoice must be drawn up in French (Charter, s. 57)." },
    { q: "Can an invoice be in English only in Québec?", a: "No. Section 57 of the Charter of the French Language requires invoices and receipts to be drawn up in French. A bilingual invoice, or an English version provided in addition to the French one, is possible." },
    { q: "Do I need my QST number on an invoice under $100?", a: "Revenu Québec does not require it under $100, taxes included. The QST amount and a description must still appear. Many businesses show it on every invoice anyway." },
    { q: "How long do I need to keep my invoices?", a: "Six years after the end of the last year to which they apply, according to Revenu Québec, and longer if you object to an assessment or appeal." },
    { q: "Is an invoice sent by email valid?", a: "Yes. Revenu Québec accepts electronic registers and supporting documents as long as accessible, usable copies can be produced. The same information as on a paper invoice must appear." },
  ],
  sources: [SRC.rqCalcEn, SRC.rqFactEn, SRC.rqInscEn, SRC.rqPetitEn, SRC.rqRegEn, SRC.craEn, SRC.charteEn],
  related: [
    { label: "ZeniPay online invoicing", href: "/invoices" },
    { label: "Send a payment link", href: "/guides/how-to-send-a-payment-link" },
    { label: "Offering installment payments", href: "/guides/offering-installment-payments" },
    { label: "Installment payments", href: "/installments" },
  ],
  cta: {
    title: "Send an invoice customers can pay online",
    text: "Open your business account, or write to us to check that your invoice shows what your customers need.",
    label: "Send my first invoice",
    href: REGISTER,
  },
};

export const EN_GUIDE_INSTALLMENTS: GuideData = {
  lang: "en",
  path: "/guides/offering-installment-payments",
  alternatePath: "/fr/guides/offrir-paiement-en-versements",
  title: "Offering installment payments to your customers: options and pitfalls | ZeniPay",
  description:
    "Split invoice, buy now pay later, or instalment sale: the three ways to let customers pay over time in Québec and Canada, who carries the risk, and when Québec's Consumer Protection Act comes into play.",
  h1: "Offering installment payments to your customers: options and pitfalls",
  answer:
    "A small business can offer installment payments in three ways: split its own invoice into a deposit and installments with no interest or fees (it grants the delay and keeps the risk), use a buy now, pay later plan where the customer finances the purchase on credit with a third party, or enter into a credit contract such as an instalment sale, which Québec's Consumer Protection Act regulates. The main pitfall: adding fees, interest or a cash discount can turn a simple invoice into a credit contract.",
  breadcrumb: "Offering installment payments",
  datePublished: PUBLISHED,
  dateModified: PUBLISHED,
  readingMinutes: 8,
  keywords: ["installment payments", "let customers pay over time", "deposit and installments", "buy now pay later merchant", "instalment sale Quebec"],
  blocks: [
    {
      h2: "The three options side by side",
      table: {
        caption: "Ways to let customers pay over time",
        head: ["Option", "Who grants the delay", "What the customer signs", "Who carries the non-payment risk"],
        rows: [
          ["Invoice split into installments, no credit charges", "You", "Your quote or invoice, with dates and amounts", "You"],
          ["Buy now, pay later", "A financial service provider", "Two agreements: one with you for the purchase, one with the provider for the financing ([FCAC](https://www.canada.ca/en/financial-consumer-agency/services/loans/buy-now-pay-later.html))", "Depends on your contract with the provider"],
          ["Instalment sale (credit contract)", "You, then usually a financial institution the contract is assigned to ([OPC](https://www.opc.gouv.qc.ca/commercant/secteur/credit/vente-temperament/definition), in French)", "A written credit contract", "You or the institution the contract is assigned to"],
        ],
      },
    },
    {
      h2: "Option 1: split your invoice into a deposit and installments",
      paragraphs: [
        "This is how contractors, trainers, event organizers and group travel businesses work: a deposit on signing, then installments on agreed dates. There is no lender and no credit check; you trust the customer, as you would with net-30 terms.",
        "Example on a $4,600 quote plus tax: $230 GST and $458.85 QST, for $5,288.85 (calculation in [our GST and QST guide](/guides/quebec-invoicing-gst-qst)).",
      ],
      table: {
        caption: "Sample 30 / 30 / 40 schedule on $5,288.85",
        head: ["Installment", "Date", "Amount"],
        rows: [
          ["Deposit (30%)", "On signing", "$1,586.66"],
          ["Second installment (30%)", "Start of work", "$1,586.66"],
          ["Balance (40%)", "End of work", "$2,115.53"],
          ["Total", "", "$5,288.85"],
        ],
        note: "The last installment absorbs the rounding so the total matches the invoice exactly.",
      },
      after: [
        "Write this schedule into the quote the customer accepts, then on the invoice: at $500 or more, payment terms are part of the information Revenu Québec asks for on an invoice ([Preparing Invoices](https://www.revenuquebec.ca/en/businesses/consumption-taxes/gsthst-and-qst/collecting-gst-and-qst/preparing-invoices/)).",
      ],
    },
    {
      h2: "The main pitfall: creating a credit contract without realizing it",
      paragraphs: [
        "As long as the customer pays the same price, in several parts, with no added fees, you are simply giving them time. Once paying in installments costs more than paying up front, credit charges come into the picture.",
        "In its section on instalment sales, Québec's [Office de la protection du consommateur](https://www.opc.gouv.qc.ca/commercant/secteur/credit/vente-temperament/paiements) (OPC, in French) lists as credit charges, among others: interest, administration fees, membership or renewal fees, commissions, and the value of the discount the consumer gets for paying cash. A \"5% off if you pay in full\" offer can therefore bring your plan under the credit rules.",
        "For instalment sales, the OPC also states that the merchant must assess the consumer's capacity to repay before entering into the contract; otherwise it loses the right to credit charges and must refund any already paid ([prior assessment](https://www.opc.gouv.qc.ca/commercant/secteur/credit/vente-temperament/contrat/evaluation-prealable), in French). If you want to add fees, interest or a cash discount, check with the OPC or a lawyer first.",
      ],
    },
    {
      h2: "Option 2: buy now, pay later",
      paragraphs: [
        "With this type of plan, the [Financial Consumer Agency of Canada](https://www.canada.ca/en/financial-consumer-agency/services/loans/buy-now-pay-later.html) explains, the customer is financing the purchase with credit, and if they do not make their payments on time they will usually have to pay fees. They enter into one agreement with you for the purchase and another with the financial service provider for the financing.",
        "For you, the advantage is being paid by the provider rather than the customer. Before signing, ask in writing for: the fees charged to the merchant on each sale, when the funds are paid out, how returns and refunds work, and who answers the customer if there is a dispute about a payment.",
      ],
    },
    {
      h2: "Option 3: the instalment sale",
      paragraphs: [
        "According to the [OPC](https://www.opc.gouv.qc.ca/commercant/secteur/credit/vente-temperament/definition), an instalment sale contract is a contract of sale on credit: the merchant finances the goods, usually assigns the contract to a financial institution, and remains the owner of the goods (or the institution does) until the consumer has paid the full price and the credit charges.",
        "It is mostly used for higher-value goods and comes with specific obligations: a written contract, a prior assessment of the capacity to repay, statements of account on request. For a service paid in a few installments with no charges, option 1 is almost always simpler.",
      ],
    },
    {
      h2: "Other common pitfalls",
      bullets: [
        "Starting work without a deposit: make the first installment due on signing.",
        "Vague dates (\"balance later\"): every installment needs a written date and amount.",
        "Chasing payments by hand: without automatic reminders, a forgotten installment becomes a debt nobody wants to raise.",
        "Improvised failed-payment fees: for instalment sales, the OPC limits fees for an NSF cheque or a refused transfer to what the financial institution charged you.",
        "A final installment larger than the customer can send by bank transfer: at ZeniPay, bank transfers are capped at $2,500 per transaction; above that, the customer pays by card or you split differently.",
      ],
    },
    {
      h2: "Installment payments with ZeniPay",
      paragraphs: [
        "ZeniPay covers option 1. You choose 2 to 12 installments per invoice, by amount or percentage, with a date for each. Installments due today are emailed immediately; the others go out automatically on their due date, each with its own link for card or bank transfer payment.",
        "A reminder is sent 3 days and again 7 days after an unpaid due date, a receipt goes out as soon as an installment is paid, and the invoice moves from partially paid to paid with the last one. You can resend or cancel an installment from the dashboard.",
        "ZeniPay does not lend money, does not run credit checks and does not charge the customer interest: you grant the delay and the non-payment risk stays with you, which is why a deposit matters. Details on the [Installment payments](/installments) page.",
      ],
    },
  ],
  faq: [
    { q: "How can I let customers pay in installments without a financing company?", a: "Split your invoice into a deposit and installments on set dates, at the same price as paying up front and with no added fees. Put the schedule in the accepted quote and send each installment with its payment link on its date." },
    { q: "Can I charge interest or fees on installment payments?", a: "If you add interest or fees, your arrangement may become a credit contract regulated by Québec's Consumer Protection Act, with specific obligations. Check with the Office de la protection du consommateur or a lawyer before you do." },
    { q: "Can I offer a discount to customers who pay in full?", a: "Be careful: in its section on instalment sales, the OPC counts the value of a cash-payment discount as a credit charge. A higher price in installments than up front can bring your offer under the credit rules." },
    { q: "What is the difference between installments and buy now, pay later?", a: "With an installment invoice, you grant the delay and the customer pays you over time. With a buy now, pay later plan, the customer finances the purchase on credit with a financial service provider under a separate agreement." },
    { q: "What if a customer misses an installment?", a: "Follow up quickly with the same link. In ZeniPay a reminder is sent automatically 3 days and 7 days after the due date, and the dashboard shows which installments are late. If it continues, call the customer before going further." },
    { q: "How many installments should I offer?", a: "Enough to make the amount manageable, and no longer than the job or service lasts. For a contract of a few weeks, a deposit and two installments are often enough. ZeniPay allows 2 to 12 installments per invoice." },
    { q: "How do I handle sales tax on an invoice paid in installments?", a: "Calculate GST (5%) and QST (9.975%) on the full price, then split the tax-included total across the installments. On $4,600 plus tax ($5,288.85), a 30 / 30 / 40 schedule gives $1,586.66, $1,586.66 and $2,115.53." },
  ],
  sources: [SRC.opcDefEn, SRC.opcEvalEn, SRC.opcPayEn, SRC.fcacEn, SRC.rqFactEn, SRC.rqCalcEn],
  related: [
    { label: "ZeniPay installment payments", href: "/installments" },
    { label: "Québec invoicing: GST and QST", href: "/guides/quebec-invoicing-gst-qst" },
    { label: "Send a payment link", href: "/guides/how-to-send-a-payment-link" },
    { label: "Online invoicing", href: "/invoices" },
  ],
  cta: {
    title: "Split your next invoice into installments",
    text: "Deposit today, balance on its dates, automatic reminders. Open your business account or ask us your questions.",
    label: "Create an installment invoice",
    href: REGISTER,
  },
};

export const FR_GUIDES = [FR_GUIDE_PAYLINK, FR_GUIDE_TAXES, FR_GUIDE_INSTALLMENTS];
export const EN_GUIDES = [EN_GUIDE_PAYLINK, EN_GUIDE_TAXES, EN_GUIDE_INSTALLMENTS];
export const ALL_GUIDES = [...FR_GUIDES, ...EN_GUIDES];
