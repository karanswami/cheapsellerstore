# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/faqs` — UI status: ✅ live
- Page: `src/app/admin/(panel)/faqs/page.tsx` → `FaqsWorkspace`
- Loading: `src/app/admin/(panel)/faqs/loading.tsx`
- Workspace: `src/components/admin/faqs/faqs-workspace.tsx` (compact list + Dialog create/edit; Switch active; delete confirm)
- Layout: `src/app/admin/(panel)/layout.tsx` → `src/components/admin/admin-shell.tsx`, `src/components/admin/admin-sidebar.tsx`
- APIs: `src/app/api/admin/faqs/route.ts` (GET/POST), `src/app/api/admin/faqs/[id]/route.ts` (PATCH/DELETE)
- Schema: `FaqItem` (`question`, `answer`, `category?`, `active`, `sortOrder`)
- Public consumers: `/faq` + `/api/faqs` + support chat chips / FAQ match (`src/lib/faqs.ts`)

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Admin gate: customer JWT with `User.role === ADMIN` via `src/app/admin/(panel)/layout.tsx` + `AdminShell`.
- List pages are read-only rows/badges; mutations only inside shadcn Dialog.
- Mobile-first compact lists; no inline editors on list rows.
- Active FAQs feed storefront `/faq`, profile help row, support starter chips, and support AI live pack.

## 3. Permitted Edit Scopes (Write Fields)
- FAQ Dialog: `question`, `answer`, `category`, `active`, `sortOrder`.
- List row opens edit Dialog; delete via confirm.
- Do not invent a second FAQ store — use `FaqItem` + existing admin APIs.
- Seed defaults: `npm run db:seed-faqs` (idempotent by exact `question`).
