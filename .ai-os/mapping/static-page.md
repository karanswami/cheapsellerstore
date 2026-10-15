# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/pages/[slug]` — public (SiteChrome header + footer + Support FAB)
- Page: `src/app/pages/[slug]/page.tsx`
- Loading: `src/app/pages/[slug]/loading.tsx` (PageHeader + article + related chips skeleton)
- Components: `src/components/landing/static-page-view.tsx` (back link · PageHeader · glass “Official document” article · FAQ/Store chips)
- Chrome: `src/components/layout/site-chrome.tsx` (`min-h-dvh` flex column pins footer), `src/components/landing/site-footer.tsx` (dynamic active page links via `/api/pages`), `src/components/layout/page-transition-shell.tsx` (`flex-1` content grow), `src/components/layout/support-chat.tsx` / `support-fab.tsx`
- Shared: `src/components/layout/page-header.tsx`
- Libs: `src/lib/static-pages.ts` (`getActiveStaticPagesNav`, `getActiveStaticPageBySlug`), `src/types/static-page.ts`
- APIs: `src/app/api/pages/route.ts` (public GET active nav)
- SEO: `src/app/robots.ts`, `src/app/sitemap.ts` (includes active `/pages/[slug]`)
- Seed: `prisma/seed-static-pages.ts` → `npm run db:seed-pages`
- Admin source: `/admin/static-pages` → `StaticPage`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Show **active** pages only; inactive/missing slug → `notFound()`.
- Public page — no auth required; `/app` profile links here too.
- Content is plain text (`whitespace-pre-wrap`); do not invent markdown unless product asks.
- Short pages must keep footer at viewport bottom via SiteChrome `min-h-dvh` flex shell — do not remove that wrapper.

## 3. Permitted Edit Scopes (Write Fields)
- Page presentation (title, content body, empty/not-found, related chips).
- Do not add admin CRUD here — that lives at `/admin/static-pages`.
