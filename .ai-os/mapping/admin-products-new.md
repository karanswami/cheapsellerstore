# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/products/new` — REDIRECT SHELL only
- Page: `src/app/admin/(panel)/products/new/page.tsx`
- Behavior: `redirect("/admin/products")` — no workspace UI
- Real work lives on target map for `/admin/products`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Do not reintroduce full edit pages here — Dialog CRUD stays on list desks.
- Keep redirect so old nested URLs do not 404.

## 3. Permitted Edit Scopes (Write Fields)
- Only change redirect target if product navigation intentionally moves.
- No forms, APIs, or Prisma on these shells.
