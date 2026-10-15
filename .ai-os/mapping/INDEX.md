# Feature Maps & Access Rules

## 1. File Inventory
- Purpose: one `.md` per page (plus shared auth) for low-token agent context
- How to use: attach only the map(s) for pages you will edit
- Landing: `landing-home.md`, `faq-page.md`, `static-page.md`
- Shared UI atoms: `PageHeader` (`layout/page-header.tsx` — public/admin only; **not** customer hub desks), `EmptyState`, `DialogShell`, `FilterChip` under `components/ui/`
- Global interaction feedback: `layout/interaction-feedback-provider.tsx` + `lib/feedback.ts` (`feedbackTap`) + `hooks/use-interaction-feedback.ts` + press CSS in `globals.css` (`.pressable`)
- Global content protection: `layout/content-protection.tsx` + `layout/content-protection-noscript.tsx` (production: no right-click / select / copy hotkeys; **no-JS blanks via `<noscript>`**; skips `/admin` + localhost); Android APK `FLAG_SECURE` in `MainActivity`
- Global visual foundation: `layout/live-wave-background.tsx` (+ module CSS) and `layout/page-transition-shell.tsx`; `layout/reseller-apply-popup.tsx` (48h reminder for non-reseller users); motion tokens/skeleton shimmer/reduced-motion policy in `app/globals.css`
- Customer hub cluster: `app-console-shell.md` — `AppShell` layout + hub primitives (`src/components/app/hub/`: `hub-page-shell`, `hub-header-bar`, `hub-stat-pill`, `hub-toolbar`, `hub-list-row`, `hub-page-skeleton`); desk pages use `HubPageShell` + `HubHeaderBar`; `/app` home uses `AppHomeShell` (ambient only)
- Checkout/Order: `checkout-page.md`, `order-result.md`
- Auth (no pages): `shared-auth-dialog.md`
- App: `app-console-shell.md` (shared hub chrome + primitives), `app-home.md`, `app-bio.md` (VIP Access & Bio Storefront Hub), `app-deposit.md`, `app-gift-codes.md`, `app-keys.md` (reference desk), `app-leaderboard.md`, `app-profile.md`, `app-premium.md` (redirect → `/app/bio`), `app-history.md`, `app-referral.md`, `app-broadcast.md`, `app-reports.md`, `app-development.md` (`/app/development` API Keys; `/app/api` redirects), `app-become-seller.md`, `app-become-reseller.md` (redirect), `app-seller.md`, `app-seller-leaderboard.md`

- Public: `app-public-profile.md` (`/{username}` trust page; legacy `/app/users/[username]` redirects), `developers-docs.md` (`/developers` public API docs; `/docs` redirects)
- System: `system-status-screens.md` — maintenance / banned / session-expired / 404 / error / offline SW
- Admin live: `admin-overview.md`, `admin-statistics.md`, `admin-development.md`, `admin-premium-settlements.md`, `admin-special-inventory.md`, `admin-history.md`, `admin-logs.md`, `admin-analytics.md`, `admin-users.md` (includes Premium), `admin-special-prices.md`, `admin-sellers.md`, `admin-resellers.md` (redirect), `admin-premium.md` (redirect → users), `admin-seller-api.md`, `admin-settings.md` (includes Support bot + Sound & haptics + **Telegram notifications** + **Payment API keys**), `admin-site-config.md`, `admin-icons.md`, `admin-cron.md`, `admin-banners.md`, `admin-promos.md`, `admin-flash-sales.md`, `admin-categories.md`, `admin-products.md`, `admin-keys.md`, `admin-supplier.md`, `admin-key-check.md`, `admin-reviews.md`, `admin-faqs.md`, `admin-static-pages.md`, `admin-orders.md`, `admin-deposits.md`, `admin-gift-codes.md`, `admin-reports.md`, `admin-broadcast.md`
- Admin redirects: `admin-categories-new.md`, `admin-categories-id.md`, `admin-products-new.md`, `admin-products-id.md`, `admin-products-keys-duration.md`, `admin-orders-id.md`
- Legacy cluster maps (optional broader context): `admin-catalog.md`, `seller-hierarchy.md`, `support-pipeline.md`, `admin-analytics-history.md`

## 2. Hard Governance Rules (Read-Only Guardrails)
- **Maps first:** open this INDEX → open only the page map(s) in scope before reading/searching application code.
- **No wasteful search:** if File Inventory already lists the page/components/libs/APIs, do not repo-wide explore to rediscover them.
- Open only files named in the map unless a detail is missing for a safe edit.
- If a map is missing, stale, or incomplete: do a **targeted** code check for that gap only, then **update the map in the same session**.
- Always keep Prisma server-only, USD microcents, Dialog-only admin edits, hidden unused key codes.
- Redirect-shell maps must stay marked as redirects (no fake full workflow).

## 3. Permitted Edit Scopes (Write Fields)
- When finishing a feature, update the matching page map File Inventory / guardrails / write scopes if paths or APIs changed.
- New route → new `.md` here + add a bullet to section 1 above.
- Prefer asking humans to attach specific mapping `.md` files over dumping large `src/` trees.
- Cluster maps (`admin-catalog.md`, `support-pipeline.md`, etc.) are optional extras when a change spans many pages; page maps remain the default.
