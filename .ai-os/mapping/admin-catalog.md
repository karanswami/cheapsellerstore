# Feature Maps & Access Rules

## 1. File Inventory
- Pages: `src/app/admin/(panel)/categories/page.tsx`, `src/app/admin/(panel)/categories/new/page.tsx`, `src/app/admin/(panel)/categories/[id]/page.tsx`, `src/app/admin/(panel)/products/page.tsx`, `src/app/admin/(panel)/products/new/page.tsx`, `src/app/admin/(panel)/products/[id]/page.tsx`, `src/app/admin/(panel)/products/[id]/keys/[durationId]/page.tsx`, `src/app/admin/(panel)/keys/page.tsx`, `src/app/admin/(panel)/key-check/page.tsx`
- Workspaces: `src/components/admin/categories/categories-workspace.tsx`, `src/components/admin/products/products-workspace.tsx`, `src/components/admin/products/admin-product-dialog.tsx`, `src/components/admin/keys/keys-workspace.tsx`, `src/components/admin/key-check/key-check-workspace.tsx`
- APIs: `src/app/api/admin/categories/[id]/route.ts`, `src/app/api/admin/products/[id]/route.ts`, `src/app/api/admin/keys/[id]/route.ts`, `src/app/api/admin/products/upload` (via workspace flow), `src/app/api/admin/keys`, `src/app/api/admin/keys/check`
- Core libs / schema: `src/lib/products.ts`, `src/lib/keys.ts`, `src/lib/durations.ts`, `src/lib/public-uploads.ts`, `src/lib/slug.ts`, `src/lib/prisma.ts`, `prisma/schema.prisma` (`Category`, `Product`, `Duration`, `DurationPrice`, `Key`, `KeyStatus`)

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma access stays server-only; admin pages consume workspaces, not client-side database code.
- Catalog pricing is USD-only microcents; durations carry explicit `DurationPrice` values. No FX or alternate currency math.
- Public catalog must not expose unused `Key.code`; exact key checking is admin-only.
- Category deletes orphan products; product deletes are blocked while keys still exist.
- Product changes may create categories by name, but slug rules stay normalized and server-validated.
- Key cleanup is limited to `AVAILABLE` keys only.
- Admin list rows stay read-only; mutations happen in dialogs or server routes.

## 3. Permitted Edit Scopes (Write Fields)
- Category dialogs may edit `name`, `slug`, `sortOrder`, and product membership selection.
- Product dialogs may edit `title`, `description`, `categoryId` / `categoryName`, `features`, `imageUrl`, `isBestSeller`, `isNew`, `isActive`.
- Duration / price editors may adjust the duration record and its USD microcent prices, but not introduce alternate currencies.
- Keys workspace may import, delete `AVAILABLE` keys, and change inventory metadata only through admin actions.
- Key-check UI may inspect exact codes and sold status, but not reveal unused codes publicly.
