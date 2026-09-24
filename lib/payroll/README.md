# Paie — Québec

Module de paie de ZeniPay. Calcule le brut vers net d'un employé québécois et le
coût réel pour l'employeur, avec les retenues des deux ordres de gouvernement.

## Où est quoi

| Fichier | Rôle |
|---|---|
| `rates/2026.ts` | Tous les paramètres légaux de l'année, avec leur source |
| `rates/index.ts` | Choisit le barème d'une année ; **lève** si l'année est inconnue |
| `types.ts` | Types d'entrée et de sortie du moteur |
| `calculate.ts` | Le moteur : `calculatePay(input) → result` |
| `remittance.ts` | Calendrier et montants des remises à Revenu Québec et à l'ARC |
| `pay-run.ts` | Exécution d'un cycle : calcul de tous les bulletins, puis persistance |
| `access.ts` | Contrôle d'accès — obligatoire, le client contourne la RLS |
| `supabase-client.ts` | Client service_role du schéma `payroll` |
| `__tests__/` | 60 tests : plafonds, exemptions, assiettes, échéances, cycles |
| `../../app/api/v1/payroll/calculate/route.ts` | API de calcul (ne persiste rien) |
| `../../app/api/v1/payroll/runs/route.ts` | Liste et création des cycles de paie |
| `../../app/api/v1/payroll/runs/[id]/approve/route.ts` | Approbation (point de non-retour) |
| `../../app/payroll/page.tsx` | Calculateur dans le tableau de bord |
| `../../supabase/migrations/20260923000001_payroll_quebec.sql` | Schéma `payroll` |

## Ce que le moteur calcule

**Retenues sur la paie de l'employé**
- RRQ : régime de base + 1er volet supplémentaire (6,30 %), puis RRQ2 (4 %)
  entre le maximum des gains admissibles et le maximum supplémentaire
- Assurance-emploi au taux réduit du Québec (1,30 %)
- RQAP (0,430 %)
- Impôt fédéral, avec l'abattement du Québec de 16,5 %
- Impôt du Québec, avec la déduction pour travailleur

**Charges de l'employeur**
- RRQ et RRQ2 : même montant que l'employé
- Assurance-emploi : 1,4 × la part de l'employé (ou le multiplicateur réduit accordé)
- RQAP (0,602 %)
- Fonds des services de santé : taux selon la masse salariale et le secteur
- CNESST : seulement si le taux de l'employeur est configuré

## Règles du module

**Un fichier de taux par année, jamais modifié rétroactivement.** Une paie versée
en mars doit pouvoir être recalculée à l'identique deux ans plus tard devant un
vérificateur. Pour 2027, on crée `rates/2027.ts` — on ne touche pas à 2026.

**Le moteur refuse de deviner.** Année sans barème → il lève. Taux CNESST absent
→ aucune prime et un avertissement, plutôt qu'un chiffre inventé. Chaque calcul
renvoie `notes[]` : ce sont les messages que l'humain qui approuve la paie doit lire.

**L'impôt est annualisé.** C'est la méthode du T4127 et du TP-1015.G : on projette
la période sur l'année, on calcule l'impôt annuel, on divise. Un calcul période par
période ferait payer trop ou trop peu et laisserait un solde à la déclaration.

**Les plafonds s'appliquent contre le cumulatif.** `input.ytd` porte les gains et
cotisations depuis le début de l'année ; le résultat renvoie le cumulatif mis à
jour, à enregistrer pour la période suivante.

**Par défaut, un gain est assujetti partout.** Un oubli de configuration doit
produire une retenue, jamais une exemption silencieuse.

## ⚠️ Avant la première paie réelle

Les paramètres 2026 ont été assemblés à partir des publications officielles, mais
`verifiedOn` est encore `null`. Il faut valider chaque ligne de `rates/2026.ts`
contre :

- **ARC T4127** — Formules pour le calcul des retenues sur la paie
- **Revenu Québec TP-1015.F** — Tables des retenues à la source, et le guide TP-1015.G
- **Retraite Québec** — taux et maximums du RRQ
- **RQAP** — taux et maximum des gains assurables
- **Commission de l'assurance-emploi** — taux du Québec et maximum assurable

Puis comparer une dizaine de cas au calculateur **WebRAS** de Revenu Québec et au
**CDR** de l'ARC. Quand les montants concordent au cent près, inscrire la date dans
`verifiedOn` : l'avertissement disparaît alors de chaque calcul.

## Cycle de vie d'une paie

1. **Brouillon** — `POST /api/v1/payroll/runs` calcule tous les bulletins et les
   enregistre. Le cumulatif annuel ne bouge pas : on peut recalculer autant de
   fois qu'on veut sans fausser les plafonds.
2. **Approuvé** — `POST /api/v1/payroll/runs/[id]/approve` fige le cycle et fait
   avancer `payroll.ytd`. Réservé aux rôles admin et propriétaire : celui qui
   prépare la paie ne devrait pas être celui qui l'approuve. Un déclencheur en
   base empêche un cycle approuvé de revenir en brouillon.
3. **Payé** — versement du net (pas encore branché).

## Remises

`remittance.ts` calcule la période et l'échéance selon la fréquence attribuée à
l'employeur, et sépare ce qui va à **Revenu Québec** (impôt du Québec, RRQ et
RQAP des deux parts, FSS) de ce qui va à l'**ARC** (impôt fédéral, AE des deux
parts). La CNESST n'y figure pas : elle se paie séparément.

C'est la date de **versement** au salarié qui détermine la période, pas la fin
de la période de travail. Une paie de mars versée le 2 avril se remet en avril.

## Ce qui n'est pas encore fait

- Versement du net par dépôt direct (à brancher sur le module bancaire existant)
- Génération automatique des lignes de `payroll.remittances` à l'approbation
- Relevé 1 et T4 de fin d'année
- Relevé d'emploi (RE) lors d'une cessation
- Heures supplémentaires, primes, avantages imposables, saisies de salaire
- Bulletin de paie en PDF pour l'employé
