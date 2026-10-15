# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/faq` — public (SiteChrome header + footer + Support FAB)
- Page: `src/app/faq/page.tsx`
- Loading: `src/app/faq/loading.tsx`
- Components: `src/components/landing/faq-view.tsx` (Collapsible Q&A, optional category groups; glass list cards + soft primary wash)
- Chrome: `src/components/layout/site-chrome.tsx` (`min-h-dvh` flex pins footer), `src/components/landing/site-footer.tsx` (FAQ link), `src/components/layout/support-chat.tsx` / `support-fab.tsx`
- Libs: `src/lib/faqs.ts` (`getActiveFaqs`), `src/types/faq.ts`
- APIs: `src/app/api/faqs/route.ts` (public GET active)
- Admin source: `/admin/faqs` → `FaqItem`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Show **active** FAQs only; never invent hardcoded Q&A in the page.
- Public page — no auth required; `/app` profile links here too.
- Support may deep-link here (`All FAQs` / `More FAQs` buttons).

## 3. Permitted Edit Scopes (Write Fields)
- FAQ presentation (collapse UI, empty state, category grouping).
- Do not add admin CRUD here — that lives at `/admin/faqs`.
