# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/app/premium` (Redirect shell → `/app/bio`)
- Page: `src/app/app/premium/page.tsx`
- Target Unified Hub: `/app/bio` (`app-bio.md`)


## 2. Hard Governance Rules (Read-Only Guardrails)
- Shared shell rules: `app-console-shell.md`.
- Prisma only on server; client uses `premium-utils` (never import `@/lib/prisma` or server `premium.ts` purchase helpers into client except via re-exported utils).
- Money is USD microcents only; Premium price is whole USD dollars in `AppSetting` `premium_price_usd` (default 10), converted with `usdToMicrocents`.
- One-time lifetime unlock: `User.isPremium` + `premiumPurchasedAt`; ledger `TransactionType.PREMIUM_PURCHASE`.
- Wallet purchase sets `emailVerified: true` (account verified badge), unlocks VIP Priority Support queue, free Platform API key creation, and 300 RPM rate limit tier.
- Successful wallet unlock fires Telegram `premium` channel (Settings → Telegram notifications); admin grant/revoke does not notify.
- Wallet unlocks feed `/admin/premium-settlements` (50% developer share); admin grants do not.
- **Mongo caveat:** older User docs may omit `isPremium` — purchase materializes `isPremium: false` via Prisma `update` first, then atomic `updateMany` debit.
- Customer session required; guests → `/?auth=login&next=/app/premium`.
- Edits Dialog-only (purchase / username / referral / bio / privacy / socials / border / emoji / featured).
- Customization fields require `isPremium` on API; privacy (`isProfilePublic`) stays free for all users.

## 3. Permitted Edit Scopes (Write Fields)
- `HubHeaderBar` membership stats; `HubPanelCard` section layout.
- Premium status card + unlock purchase Dialog (wallet debit + email verify).
- Share card (public URL + referral invite); identity + customization Dialogs.
- Non-premium: locked rows open purchase Dialog (except privacy).
- Do not put password/2FA/mute here — those stay on `/app/profile`.
- DialogShell footers must use `mx-0 mb-0` so Save/Cancel are not clipped.
