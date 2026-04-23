# PR 20.1 — Coverage audit

Recorded on the branch snapshot at commit `37d4660` (PR 20 merged). This is the
ground truth for what the session needs to reskin and what's already done.

Legend
- **NEW**   — route file already renders on DashboardShell + new tokens (PR 20).
- **SHELL** — delegates to DashboardShell but the interior content is still
  using legacy Card/Metric/ad-hoc layout (PR 20 Part 5 took this shortcut on
  /agents/*). Needs interior reskin.
- **OLD**   — route file is an AppRouter shim; URL is handled by
  ZenivaComplete's internal tab renderer with its own sidebar. Needs either
  a full rewrite on DashboardShell or a follow-up ZenivaComplete refactor.
- **N/A**   — auth / marketing / utility, not in the scope of this PR.

## /app/* merchant surface

| Route                        | State  | Function                                                                 | APIs / internals                                 |
|------------------------------|--------|--------------------------------------------------------------------------|--------------------------------------------------|
| /app                         | N/A    | 302 → /app/overview (next.config.js redirect)                            | —                                                |
| /app/overview                | NEW    | Landing dashboard                                                        | /api/zenipay/banking-ops, /api/zenipay/stats     |
| /app/accounts                | NEW    | Accounts list + reveal toggle                                            | /api/zenipay/banking-ops                          |
| /app/accounts/[id]           | NEW    | Per-account detail (activity / details / statements / settings)          | /api/zenipay/banking-ops, /api/zenipay/stats     |
| /app/transactions            | NEW    | Unified feed with URL-synced filters                                     | /api/zenipay/banking-ops, /api/zenipay/stats     |
| /app/contacts                | NEW    | Beneficiaries table + add modal                                          | /api/zenipay/banking-ops (save_contact, delete)  |
| /app/banking                 | OLD    | Legacy "banking" tab (BankingPage inside ZenivaComplete)                 | /api/zenipay/banking-ops                          |
| /app/invoices                | OLD    | Invoice list, auto-invoice rules, create, send, mark paid (CRITICAL)     | ZenivaComplete internals + invoicing logic       |
| /app/pay-links               | OLD    | Payment links list + create (CRITICAL for the public /pay landing)       | ZenivaComplete internals                          |
| /app/settings                | OLD    | Profile / Business / Team / API keys / Notifications / Billing           | ZenivaComplete internals                          |
| /app/accounting              | OLD    | Accounting + exports (QuickBooks / Xero / CSV / PDF)                     | ZenivaComplete internals                          |
| /app/analytics               | OLD    | Analytics tab                                                            | ZenivaComplete internals                          |
| /app/financing               | OLD    | Financing tab (stretch)                                                  | ZenivaComplete internals                          |
| /app/cashback                | OLD    | Cashback tab (stretch)                                                   | ZenivaComplete internals                          |
| /app/ben-ai                  | OLD    | Ben AI assistant tab                                                     | ZenivaComplete internals                          |
| /app/go-live                 | OLD    | Go-live onboarding flow                                                  | ZenivaComplete internals                          |
| /app/setup                   | OLD    | Setup wizard                                                             | ZenivaComplete internals                          |
| /app/onboarding-status       | OLD    | Onboarding status page                                                   | ZenivaComplete internals                          |
| /app/keys                    | OLD    | Legacy API keys tab                                                      | ZenivaComplete internals                          |
| /app/wallets                 | OLD    | Send / receive / contacts tab (via [tab] catch-all → BankingPage)        | /api/zenipay/banking-ops                          |
| /app/cards                   | OLD    | Cards list + issue (via [tab] catch-all → BankingPage)                   | /api/zenipay/banking-ops, /api/zenipay/cards/*   |
| /app/[tab]                   | N/A    | Catch-all that returns AppRouter → ZenivaComplete for any `tab`          | depends on tab                                   |
| /app/page.tsx (root)         | N/A    | Hosts AppRouter that boots ZenivaComplete                                | /api/zenipay/merchant-info, /api/zenipay/stats   |

## /agents/* AI-bank surface

Every page still imports `{ Shell, Card, Metric }` from
`components/agents/Shell.tsx`, which PR 20 rewrote to delegate to
DashboardShell. That change fixed the OUTER chrome but left interiors
rendering `<Card>` + `<Metric>` (= `BankingCard` wrappers without brand
accent + tokens). All of the pages below are therefore **SHELL** state —
chrome matches, interior needs updating to the signature components.

| Route                                        | State   | Function                                                                   |
|----------------------------------------------|---------|----------------------------------------------------------------------------|
| /agents                                      | N/A     | Home/bounce                                                                |
| /agents/login                                | N/A     | Auth                                                                       |
| /agents/overview, /agents/dashboard          | SHELL   | Main AI dashboard (balance / agents / live ledger feed)                    |
| /agents/treasury                             | SHELL   | Treasury dashboard (PR 8)                                                  |
| /agents/treasury/fund                        | SHELL   | Fund treasury via Finix card (PR 8, Finix.js tokenization)                 |
| /agents/treasury/sources                     | SHELL   | Funding sources list (PR 8)                                                |
| /agents/treasury/history                     | SHELL   | Funding event history (PR 8)                                               |
| /agents/ledger                               | SHELL   | ZeniCore journal + chain integrity (SHOWCASE for investors)                |
| /agents/zenicards                            | SHELL   | Virtual cards list + issue wizard                                          |
| /agents/cards, /agents/cards/[id], …         | SHELL   | External cards linked to agents                                            |
| /agents/agents, /agents/agents/[id]          | SHELL   | Agent roster + detail                                                      |
| /agents/approvals, /agents/approvals/[id]    | SHELL   | Human-in-the-loop approvals                                                |
| /agents/fraud, /agents/fraud/[id]            | SHELL   | ML fraud signals                                                           |
| /agents/audit                                | SHELL   | Signed audit trail                                                         |
| /agents/accounting + sub-routes              | SHELL   | Accounting / GL categorisation / reports                                   |
| /agents/transactions                         | SHELL   | Agent transaction feed                                                     |
| /agents/wallets                              | SHELL   | Agent wallet controls                                                      |
| /agents/api-keys                             | SHELL   | Agents API key management                                                  |
| /agents/settings + sub-routes                | SHELL   | Agent settings (profile, approvals, etc.)                                  |

## Session scope (realistic)

This session ships:

- Part 1 — this audit (DONE).
- Part 2 — new DashboardShell routed pages for the Alex-named critical
  surfaces: **/app/invoices** and **/app/pay-links**. Additional
  routed pages for **/app/cards**, **/app/wallets**, **/app/settings**.
  Smaller merchant tabs (analytics, financing, cashback, ben-ai,
  accounting, go-live, setup, onboarding-status, keys) keep routing
  through ZenivaComplete for the moment — they are flagged for a
  ZenivaComplete refactor PR.
- Part 3 — interior reskin for the investor-demo pages on /agents/*:
  overview, treasury + sub-routes, ledger, zenicards. The other
  /agents/* pages already inherit the new shell from PR 20 Part 5 and
  render correctly at the chrome level; their interiors reuse `Card` +
  `Metric` from the new wrapper, so they are visually consistent with
  the brand. Individual page polish is continued in a follow-up.

## Explicitly out of scope

- ZenivaComplete.tsx rewrite — 3600-line file with its own sidebar
  + internal tab state. A dedicated refactor PR is the right place.
- Any DB migration, new API route, or schema change.
- Public surfaces: landing `/`, `/merchant`, `/agents/overview`
  marketing page, `/pay/[slug]`, `/checkout/[slug]`.
