# Drip — System Prompt & Coding Standards

> **Last synced:** 2026-07-29 (**Version 1.0 — shipped / launchable**)

## 1. Mission

Build **Drip**: public landing storefront → customer auth → hub console dashboard → checkout in USD → admin inventory. Prefer next unchecked `.ai-os/todo.md` item. **Reusable code first** — thin pages, logic in `src/lib/*`, shared shells.

## 2. Stack lock

Next.js 16 App Router · React 19 · Prisma 6 + MongoDB · shadcn + Tailwind 4 · Context (cart + auth) · zod · jose · bcryptjs · lucide-react · next-themes · resend · sonner · otpauth · qrcode · recharts

Do not add Redux, Zustand, tRPC, FX conversion.

## 3. Architecture rules

1. Database-first catalog/orders/admin
2. Prisma only on server
3. Never expose unused `Key.code` on public catalog
4. Atomic key claim with AVAILABLE status guard
5. Domain folders under `components/{landing,catalog,cart,product,auth,app,admin,checkout,layout,theme}/`
6. Currency is **USD only**; money via `formatMoney` / `usdToMicrocents` — **no rates**, no multi-currency catalog
7. Wallet balance lives on `User.walletBalance` (USD microcents) with `Transaction` ledger; deposits may use multiple methods but credit USD only — do not invent FX rates
8. Product reviews: verified buyers only (`ProductReview`); customer submit → `PENDING`; storefront + `Product.rating` use **APPROVED** only; admin moderates at `/admin/reviews`
9. Support chat: button-tree bot (`SupportBotStep`); admin CRUD in Settings → Support bot; Lucide FAB; notifications in inbox; free text → fallback step; close asks keep vs clear — never auto-wipe on keep.
10. **Manual DB Audit Logging:** Any manual direct database mutation (script, CLI, direct Prisma execution to delete/update/purge records) MUST explicitly create a matching audit record in the `ActivityLog` collection (`category: "ADMIN"`, `action`, detailed `message`, actor details, and full `metadata` of affected items).

## 4. Auth

- Customer: JWT httpOnly `drip_customer_session` with `{ sub, role }`
- Roles: `USER` | `SELLER` | `RESELLER` | `ADMIN` on `User.role` (register → USER). Hierarchy: Admin → Seller → Reseller; Users retail.
- Admin panel: **no separate login** — only `User.role === ADMIN` via the same customer session
- Helpers: `getCurrentUser` / `requireCustomer` / `requireAdmin` (DB role check)
- Seller may create `RESELLER` only when `canCreateResellers` (admin-granted); manage status/delete via `canManageResellers`; add/cut balance via `canFundResellers` (each flag separate)
- Pricing: `SELLER` + `RESELLER` share wholesale `DurationPrice.resellerPrice`; `USER` / `ADMIN` use retail `price`. Optional admin `UserSpecialPrice` per user+duration overrides both and skips flash/promo on that line.
- **No hardcoded business details** — tunables live in admin Settings / desks (`AppSetting`), grouped by page; only invariants in code
- Admin impersonation: `drip_admin_impersonation` cookie + sticky Return to Admin banner
- Google OAuth: `/api/auth/google` + callback; requires Google `email_verified`; optional `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. Android APK: Custom Tabs + signed state + `dripclient://oauth` → `/api/auth/native-handoff` (WebView session).
- 2FA: TOTP (`otpauth`) + hashed backup codes; pending login via `drip_2fa_challenge` cookie
- Forgot password: email OTP via Resend → `PasswordResetOtp` (hashed, short TTL)
- Cookies: `secure` only when `NEXT_PUBLIC_APP_URL` starts with `https://`

## 5. API envelope

`{ data: T }` or `{ error: { code, message } }`

## 6. UI theme

Dark-only shadcn tokens in `globals.css` (`html.dark` + `forcedTheme=dark`); no light/system toggle. Build UI with shadcn primitives + Tailwind utilities. Prefer CSS Modules only when Tailwind cannot express the layout cleanly. No pixel fonts or arcade glow. Admin mutations use shadcn Dialog/Sheet — do not copy Guru CSS Modules chrome.

### Admin / console lists (mobile-first)

- Compact rows on mobile — not tall cards with stacked controls.
- List shows status/role as **badges**; balance is **read-only** in the list.
- Wallet add/cut and status/role edits happen only inside a polished detail Dialog (opened from the row).
- No redundant page tabs (e.g. Users + History) or duplicate KPI cards that waste mobile viewport.
- Dialogs: constrained height (`~92dvh`), scroll body, clear footer actions.
- **Big lists:** never fetch the full dataset into the client. Use server `page`/`limit` (or cursor) + progressive loading (infinite scroll / Load more + skeleton), like Instagram/feed apps. Reset and reload page 1 when filters/search change.

### Dialog-only edits (no inline textboxes)

- **Never** add inline `Input` / `Textarea` / edit forms on admin or hub page bodies (Settings, Users, catalog, etc.).
- Pages are **read-only summaries** (rows + badges). Create/edit/mutate opens a polished shadcn `Dialog`.
- Prefer Dialog header band + icon, `DialogDescription`, scroll body, Cancel/Save footer. Use `Switch`/`Select` inside dialogs — not raw checkboxes on the page.
- Search/filter query bars are OK; they are not settings editors.

## 7. Mandatory AI-OS sync

Before code: read STATUS, features, todo, routes, architecture-map, this file, plus `.ai-os/mapping/INDEX.md` and the page map(s) for routes in scope.  
After features: update those docs **and** the touched page maps in the same session.

## 7b. Mapping-first workflow (save tokens)

1. **Maps first** — `.ai-os/mapping/<page>.md` lists page, components, libs, APIs. That inventory is the default file set.
2. **No unnecessary code search** — if the map answers “which files?”, do not repo-wide grep/explore for the same answer. Open only listed paths.
3. **Targeted gap fill** — search code only when the map is incomplete for a safe edit; keep the search narrow; then **update the map**.
4. **Maps stay current** — every add/move/delete of a page, workspace, lib, or API used by a route must refresh that route’s map (and `INDEX.md` when the page list changes). New routes get a new map file.
5. **Human context** — prefer “attach these mapping `.md` files” over large source dumps.

## 8. Out of scope / post-v1

Live FX conversion (catalog stays USD-only), encrypted license keys, Discord OAuth, claimable task reward ledger (Tasks remain Coming soon), Stripe until product asks, hand-maintained i18n packs (**auto-translate / pt-BR deferred post-v1**).

**v1 shipped (do not re-invent):** deposit currency registry + manual methods, Cashfree/QRIS/Binance/eSewa rails, Telegram channel notifications, Capacitor Android APK shell.
