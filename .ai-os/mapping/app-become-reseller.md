# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/app/become-reseller` (**redirect**)
- Shared shell: `app-console-shell.md` (no desk UI — immediate redirect)
- Page: `src/app/app/become-reseller/page.tsx` → `redirect("/app/become-seller")`
- Hub components: **none** (redirect shell)
- Canonical map: `app-become-seller.md`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Redirect shell only — do not add a fake application workflow here.
- No `HubPageShell` / `HubHeaderBar` on this route.

## 3. Permitted Edit Scopes (Write Fields)
- None (redirect only).
