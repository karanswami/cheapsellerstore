# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/premium` (**redirect**)
- Page: `src/app/admin/(panel)/premium/page.tsx` → `redirect("/admin/users")`
- Canonical map: `admin-users.md` (Premium badges + grant/revoke live on Accounts Desk)
- Legacy APIs (optional): `GET /api/admin/premium`, `PATCH /api/admin/premium/[id]`
- Price setting remains: `/admin/settings` Premium row

## 2. Hard Governance Rules (Read-Only Guardrails)
- Redirect shell only — do not rebuild a separate Premium list page here.

## 3. Permitted Edit Scopes (Write Fields)
- None (redirect only).
