# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/icons` — UI status: live
- Page: `src/app/admin/(panel)/icons/page.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/icons/icons-workspace.tsx`, `src/components/admin/use-admin-fetch.ts`
- Consumers: `src/components/theme/site-icons-provider.tsx`, `src/components/theme/site-icon.tsx`, `src/components/layout/console-nav.tsx` (optional `iconKey` fallback), `src/components/app/deposit-method-meta.ts` + deposit views, `src/types/manual-deposit.ts` (manual method logo via pack key), `src/components/layout/site-header.tsx` (cart). Support FAB uses Lucide `MessageCircle`. Admin + customer console sidebars use Lucide, not SiteIcon.
- Libs: `src/lib/site-icons.ts`, `src/lib/settings.ts` (`SETTING_KEYS.siteIcons`), `src/lib/public-uploads.ts` (`saveIconUpload` → `/uploads/icons/`)
- Types: `src/types/site-icons.ts` (`SITE_ICON_META`, defaults under `/icons/*.png`; deposit group includes `deposit-manual`)
- Defaults: `public/icons/*.png`
- APIs: `src/app/api/admin/icons/route.ts`, `src/app/api/admin/icons/upload/route.ts`, `src/app/api/site-icons/route.ts` (public GET)

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- List pages are read-only rows/badges; mutations only inside shadcn Dialog.
- Mobile-first compact lists; no inline wallet/status editors on list rows.
- Icons page body is read-only rows (grouped); replace/reset Dialog-only.
- Empty custom URL = built-in `/icons/{key}.png` default; uploads JPG/PNG/WebP ≤ 4 MB → `/uploads/icons/`.
- Overrides stored as JSON `AppSetting` key `site_icons`.
- Deposit group icons (`deposit-qris` / `binance` / `inr` / `npr` / `manual`) are defaults for auto rails **and** manual methods that pick a pack key (or currency fallback). Per-method custom logos still set in Settings → Manual deposit methods.

## 3. Permitted Edit Scopes (Write Fields)
- Replace Dialog: upload → set `url` for one `SiteIconKey`; Reset default clears override (`url: ""`).
