# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/site-config` — UI status: live
- Page: `src/app/admin/(panel)/site-config/page.tsx`
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- Components: `src/components/admin/site-config/site-config-workspace.tsx`, `src/components/admin/use-admin-fetch.ts`
- Branding consumers: `src/components/theme/site-config-provider.tsx`, `src/app/layout.tsx` (theme CSS + metadata), `src/components/layout/site-header.tsx`, `src/components/layout/splash-screen.tsx` (+ `splash-screen.module.css`), `src/components/layout/console-brand.tsx`, `src/components/layout/console-header.tsx`, `src/components/landing/site-footer.tsx` (brand / tagline / Font Awesome socials via `lib/social-brand-icon.ts`)
- Libs: `src/lib/site-config.ts`, `src/lib/settings.ts` (SETTING_KEYS), `src/lib/public-uploads.ts` (`saveSiteUpload` → `/uploads/site/`), `src/lib/social-brand-icon.ts`, `src/lib/fontawesome.ts`
- Types: `src/types/site-config.ts` (`SiteConfig`, `SiteSocialLink`)
- APIs: `src/app/api/admin/site-config/route.ts`, `src/app/api/admin/site-config/upload/route.ts`, `src/app/api/site-config/route.ts` (public GET)
- Serve: `src/app/uploads/[...path]/route.ts` for runtime `/uploads/site/*`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- List pages are read-only rows/badges; mutations only inside shadcn Dialog.
- Mobile-first compact lists; no inline wallet/status editors on list rows.
- Site config page body is read-only rows (Brand / Colours / Assets / Socials); edits Dialog-only.
- Theme colours override CSS vars via layout-injected style (dark-only; `:root, .dark`).
- Uploads: JPG/PNG/WebP/ICO ≤ 4 MB → `/uploads/site/`.
- Socials are a custom list (`SiteSocialLink[]`, max 20) — not fixed Telegram/Discord/etc slots.
- Each social needs label + `http(s)://` URL; `iconUrl` optional (`http(s)://` or `/uploads/site/…`); empty icon → Font Awesome brand icon from label/URL (else link icon) in footer.
- Storage key `site_social_links` (JSON). Legacy per-network AppSetting keys are read-only migration fallback until the first save of `socialLinks`.

## 3. Permitted Edit Scopes (Write Fields)
- Brand Dialog: siteName, siteTagline, siteSeoDescription (siteName also drives AuthDialog login title + `Join {siteName}` register title).
- Colours Dialog: primary/accent/success dark hex (legacy light keys mirrored on save).
- Assets Dialog: logoUrl, faviconUrl, ogImageUrl (upload or clear).
- Socials Dialog: add/remove custom `socialLinks` rows (`id`, `label`, `url`, `iconUrl` upload/clear) — no premade network list.
