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
| `__tests__/calculate.test.ts` | 32 tests : plafonds, exemptions, assiettes, arrondis |
| `../../app/api/v1/payroll/calculate/route.ts` | API de calcul (ne persiste rien) |
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

## Ce qui n'est pas encore fait

- Versement du net par dépôt direct (à brancher sur le module bancaire existant)
- Remises à Revenu Québec et à l'ARC (la table `payroll.remittances` est prête)
- Relevé 1 et T4 de fin d'année
- Relevé d'emploi (RE) lors d'une cessation
- Heures supplémentaires, primes, avantages imposables, saisies de salaire
- Bulletin de paie en PDF pour l'employé
