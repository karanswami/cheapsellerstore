# Feature Maps & Access Rules

## 1. File Inventory
- Scope: shared customer hub chrome (`/app` layout) + unified desk page primitives
- Layout: `src/app/app/layout.tsx` → `getCurrentUser` + Suspense `getCustomerSidebarStats` (`src/lib/sidebar-stats.ts`) via `statsSlot`
- Shell: `src/components/app/app-shell.tsx` — `SidebarProvider` + `CustomerSidebar` + `ConsoleHeader` + `SupportFab`; **SiteFooter on `/app` home only**
- Sidebar: `src/components/app/customer-sidebar.tsx` (Lucide nav incl. dynamic pending deposit & open reports badges; Broadcast + Reports under Account; `statsSlot` footer), `src/components/app/console-user-menu.tsx` (header quick-access dropdown; controlled open + close on route change / after Install; `modal={false}`), `src/components/app/impersonation-banner.tsx`
- Footer (home): `src/components/landing/site-footer.tsx`
- PWA (global): `src/components/layout/pwa-provider.tsx`, `src/components/layout/install-app-ui.tsx` — Install banner + help Dialog mounted in root layout
- Visual foundation (global): `src/components/layout/live-wave-background.tsx` (+ module CSS) for fixed wave/aurora ambient; `src/components/layout/page-transition-shell.tsx` for native/fallback route transitions across `/app`
- Interaction feedback (global): `src/components/layout/interaction-feedback-provider.tsx`, `src/hooks/use-interaction-feedback.ts`, `src/lib/feedback.ts` — tap sound + haptic + CSS press scale on console nav / buttons / hub rows
- Shared console chrome: `src/components/layout/console-header.tsx`, `console-brand.tsx`, `console-nav.tsx` (`data-sidebar-nav` + immediate mobile sheet close; skip view-transition intercept), `console-profile.tsx` (`ConsoleQuickStats`), `console-sidebar.module.css` (dedicated snappy press/ripple), `console-header.module.css`
- Home-only wrapper: `src/components/app/app-home-shell.tsx` — thin `HubPageShell` with FAB-clearance bottom pad + `contentClassName="space-y-5"`; **ambient shell only, no `HubHeaderBar`**
- Console Home meta: `src/lib/console-page-meta.ts` subtitle `"Shop mods & tools"` (short; avoids mobile header truncate)
- Hub primitives (`src/components/app/hub/`):
  - `hub-page-shell.tsx` + `hub-page-shell.module.css` — desk `<main>` with ambient gradient + content column (`wide`, `maxWidth` sm→4xl)
  - `hub-header-bar.tsx` + `hub-header-bar.module.css` — icon + title/description + optional `HubStatPill` strip + trailing actions
  - `hub-stat-pill.tsx` + `hub-stat-pill.module.css` — label/value KPI chip (`default` | `accent` | `success`)
  - `hub-toolbar.tsx` + `hub-toolbar.module.css` — `HubToolbar`, `HubToolbarRow`, `HubSearch` (search + filter row)
  - `hub-list-row.tsx` + `hub-list-row.module.css` — `HubListStack`, `HubListRow`, `HubPanelCard`, `HubEmptyPanel`, `hubListRowStyles`
  - `hub-page-skeleton.tsx` — route `loading.tsx` placeholder matching header/toolbar/chip/row shapes
- Store home skeleton (not hub desk): `src/components/app/app-page-skeleton.tsx` — used by `/app/loading.tsx` (`variant="store"`)
- Libs: `src/lib/auth/customer.ts`, `src/lib/sidebar-stats.ts`, `src/lib/roles.ts` (`consoleTitle`, `consoleSubtitle`, `roleBadge`)
- **Desk pattern:** every `/app/*` workspace view uses `HubPageShell` + `HubHeaderBar` — **never `PageHeader`** (`src/components/layout/page-header.tsx` is public/admin only)
- **Reference desk:** `app-keys.md` — canonical `HubPageShell` + `HubHeaderBar` + `HubToolbar` + `HubEmptyPanel` composition

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Customer session required for `/app` layout (`drip_customer_session`); guests redirect to `/?auth=login&next=...`.
- Hub chrome = `AppShell` sidebar + sticky `ConsoleHeader` — not `SiteChrome` (public routes only).
- `ConsoleNav` must SSR and hydrate the same real links (no mount/skeleton gate — hydration mismatch).
- Sidebar nav links use `data-sidebar-nav`: own press motion (not global `.pressable` scale), close mobile sheet on click, and skip `PageTransitionShell` view-transition intercept for snappy navigation.
- Sidebar stats are count-only Prisma streamed via Suspense — never load full lists; layout must not await stats before children.
- Desk pages: wrap body in `HubPageShell`; page title/stats in `HubHeaderBar` (stats → `HubStatPill`); lists/toolbars use hub primitives where applicable.
- `/app` home (`AppHomeShell`) is the **only** hub route without `HubHeaderBar` — catalog/banners only; SiteFooter mounts under home content.
- Route `loading.tsx` for desk pages → `HubPageSkeleton` with props matching page density; `/app/loading.tsx` stays `AppPageSkeleton`.
- Support FAB on `/app` (not `/admin`).
- Page transitions are shell-level via `PageTransitionShell`; desk/workspace components should not add competing heavy enter/exit transforms.
- `PageTransitionShell` must not capture-intercept clicks inside dropdown/select menus (breaks Radix dismiss); header user menu closes on pathname change.
- Dialog-only mutations on desk pages — no inline edit forms on page body.

## 3. Permitted Edit Scopes (Write Fields)
- Shell layout, sidebar nav items, console header branding, quick-stats footer tiles.
- Hub primitive styling/variants (CSS modules + design tokens) — keep dark neon tokens; no second UI kit.
- `HubPageShell` `maxWidth` / `wide` / `contentClassName` per desk page.
- `HubHeaderBar` icon, title, description, `stats`, `statsLabel`, `actions`, `gradientTitle`.
- `HubPageSkeleton` row/toolbar/chip toggles per route `loading.tsx`.
- Do not reintroduce `PageHeader` on customer hub desks.
- Page-specific business logic stays in per-route maps — edit shell files only when changing shared hub chrome.
