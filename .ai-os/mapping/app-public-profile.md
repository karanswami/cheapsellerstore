# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/{username}` (public; no login required)
- Legacy redirect: `/app/users/[username]` → `/{username}` (`src/app/app/users/[username]/page.tsx`; `loading.tsx` re-exports `src/app/[username]/loading.tsx`)
- Shared shell: **not** `app-console-shell.md` — uses root `SiteChrome` (header/footer), not `AppShell`
- Page: `src/app/[username]/page.tsx`
- Loading: `src/app/[username]/loading.tsx` — custom public-profile skeleton (**not** `HubPageSkeleton`)
- Components: `src/components/app/public-profile-view.tsx`, `src/components/app/public-profile-view.module.css`, `src/components/product/product-sheet.tsx` (Buy Now → purchase Dialog + Review Drawer via rating), `src/components/catalog/flash-sale-ticker.tsx`
- Hub components: **none** — public trust page uses its own neon centered shell (outside hub desk unification)
- Libs: `src/lib/public-profile.ts`, `src/lib/products.ts` (`getProductsByIds`), `src/lib/profile.ts` (`buildPublicProfilePath`, `RESERVED_PROFILE_USERNAMES`), `src/lib/referral-code.ts`, `src/lib/auth/customer.ts`, `src/lib/currencies.ts`
- APIs: `GET /api/users/[username]` (shared `getPublicProfileByUsername`; session optional; includes `referralCode` + featured `ProductCardData[]`)
- Related: Owner edit → `/app/premium`; share/copy from Premium Share card; register invite → `/?auth=register&ref=CODE`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only; use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- **Public route** — guests and logged-in users can open `/{username}`. Optional session for owner preview / private unlock / CTA variant.
- Chrome: root `SiteChrome` — not `AppShell` / hub desk primitives.
- Username lookup via `normalizeProfileUsername` then exact DB match (lowercase).
- Reserved usernames → `notFound()`; blocked on register / Premium username / sub-seller create.
- Privacy: `isProfilePublic=false` → limited view for non-owners; owners can preview with Edit CTA.
- Do **not** auto-redirect owners away from their public URL.
- Public view shows bio, socials, role, verified/Premium badges, purchases count, avg rating; hide email/wallet/2FA from non-owners.
- **`referralCode` is safe to expose** for “Join with {name}” → `/?auth=register&ref=CODE`.
- Featured products = active catalog cards via `getProductsByIds`; Buy Now opens `ProductSheet`.
- Profile borders: PREMIUM for Premium or wholesale roles; VIP for admins only.

## 3. Permitted Edit Scopes (Write Fields)
- Read-only public profile display — no editing on this route (Edit → `/app/premium`).
- Guest CTA: **Join with {firstName}** → register dialog with referral; signed-in non-owners → Open store; owner → Share invite / Edit.
- Premium show UI: centered neon stack (identity → stats → connect → featured); responsive `max-w-md → lg:max-w-xl`.
- Avatar: plain `<img>` + corner verified/emoji slot (not Radix `Avatar`) for SSR parity.
- `FlashSaleTicker` uses `useSyncExternalStore` (server snapshot `null`) to avoid hydrate mismatch.
- Do not expose sensitive data (email, wallet balance, 2FA) to non-owners.
- Do not wrap this route in `HubPageShell` / `HubHeaderBar`.
