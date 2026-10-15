# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin`
- Page: `src/app/admin/(panel)/page.tsx`
- Loading: `src/app/admin/(panel)/loading.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `AdminShell` + `getAdminSidebarStats` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Visual foundation (global + admin shell): `src/components/layout/live-wave-background.tsx` (+ module CSS) from root layout; `src/components/layout/page-transition-shell.tsx` wraps admin route content in `AdminShell`
- Shell chrome (parity with customer hub): `console-brand` · `console-nav` (Lucide `icon` + dynamic pending/open count badges) · `console-profile` (`ConsoleHeroProfile` + `ConsoleProfileCard` + `ConsoleQuickStats`) · `console-sidebar.module.css` · `console-header` (shared sticky Badge/Separator/Lucide bar)
- Libs: `src/lib/admin-stats.ts` (`getDashboardStats`), `src/lib/sidebar-stats.ts` (`getAdminSidebarStats` — store-wide orders / AVAILABLE keys / pending deposits + `AdminSidebarBadges`), `src/types/admin-stats.ts`
- Components: `src/components/admin/overview/overview-workspace.tsx`, `src/components/admin/stats/kpi-card.tsx`, `src/components/admin/stats/admin-chart-card.tsx`, `src/components/admin/use-admin-fetch.ts`
- APIs: `src/app/api/admin/dashboard/route.ts`, `src/app/api/admin/me/route.ts`, `src/app/api/admin/sidebar-stats/route.ts`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Hub chrome via `AdminShell` / admin sidebar — same Guru-style hero profile + gradient Lucide nav + footer identity + quick stats as `/app` (footer tiles = store-wide orders / AVAILABLE keys / pending deposits).
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- Overview is read-only control room — no mutations on this page.
- Admin page transitions are shell-level; workspace-level motion should remain lightweight to preserve list performance.
- Orders count/revenue use `PAID` + `FULFILLED` only.
- Pending payments = deposits `PENDING` | `PROCESSING`; open reports = IssueReport status OPEN | IN_PROGRESS.
- Latest activity shows deposits + orders only (not mixed history); deep lists via nav.

## 3. Permitted Edit Scopes (Write Fields)
- Control-room layout: 4 health KPIs (`KpiCard` `variant="stat"`), 7-day revenue (chart or empty), Needs attention queues, Latest activity columns (`Card variant="list"` + divide-y).
- Soft rings (`ring-foreground/10`) on attention rows and list shells.
- Do not invent client-side aggregates — extend `getDashboardStats` when new KPIs are needed.
