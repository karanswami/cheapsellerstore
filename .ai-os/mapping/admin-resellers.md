# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/resellers` (**redirect**)
- Page: `src/app/admin/(panel)/resellers/page.tsx` → `redirect("/admin/sellers")`
- Canonical map: `admin-sellers.md`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Redirect shell only — Seller applications desk lives at `/admin/sellers`.

## 3. Permitted Edit Scopes (Write Fields)
- None (redirect only).
