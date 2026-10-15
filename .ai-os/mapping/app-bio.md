# Page Map: Customer VIP Access & Bio Storefront Hub (`/app/bio`)

## 1. File Inventory
- **Route:** `src/app/app/bio/page.tsx`
- **Component:** `src/components/app/bio-builder/bio-builder-view.tsx`
- **Dialogs:** `src/components/app/bio-builder/bio-dialogs.tsx`, `src/components/app/premium-dialogs.tsx` (VIP unlock, username change, custom referral)
- **Public Profile View:** `src/components/app/public-profile-view.tsx` + `public-profile-view.module.css`
- **APIs:** `src/app/api/bio/route.ts` (`GET`, `PATCH`), `POST /api/premium/purchase`, `PATCH /api/premium/username`, `PATCH /api/premium/referral-code`
- **Lib/Types:** `src/types/user.ts` (`BioCustomLink`, `BioThemePreset`), `src/lib/public-profile.ts`, `src/lib/validations.ts` (`bioConfigSchema`), `src/lib/premium.ts`, `src/lib/premium-utils.ts`, `src/lib/settings.ts` (`getPremiumPriceUsd`)
- **Routing:** `src/proxy.ts` (wildcard subdomain rewrite `username.dripclientofficial.dev` → `/[username]`)
- **Legacy Redirect:** `/app/premium` → `/app/bio`

## 2. Hard Governance Rules
- Subdomain handles are bound to verified `User.username`.
- All edits (Tagline, Custom Links, Featured Products, Cyber Themes, VIP purchase, @username changes) are Dialog-only via `DialogShell`.
- Mobile preview frame provides real-time reactive simulation of the public storefront.
- Promo codes removed from bio profile to keep experience clean and distraction-free.
- Bio customizations (themes, links, spotlight keys, taglines, socials) strictly require VIP (`User.isPremium === true` or `role === ADMIN`) on both UI and API (403 FORBIDDEN otherwise).

## 3. Permitted Edit Scopes
- `User.bioTheme`, `User.bioTagline`, `User.bioBannerUrl`, `User.bioLinks`, `User.showVouches`, `User.discordInvite`, `User.telegramChannel`, `User.youtubeVideoUrl`, `User.isPremium`, `User.username`, `User.referralCode`.

