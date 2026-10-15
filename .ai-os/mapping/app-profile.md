# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/app/profile`
- Shared shell: `app-console-shell.md`
- Page: `src/app/app/profile/page.tsx`
- Loading: `src/app/app/profile/loading.tsx` → custom hero + glass panel skeletons (not generic HubPageSkeleton)
- Components:
  - `src/components/app/profile-view.tsx`
  - `src/components/app/profile-hero-stage.tsx` (+ `profile-hero-stage.module.css`) — flowing mesh hero + avatar stage
  - `src/components/app/profile-dialogs.tsx`
  - `src/components/app/two-factor-dialog.tsx`
- PWA: `src/components/layout/pwa-provider.tsx`, `src/components/layout/install-app-ui.tsx` (`useInstallAppAction`), `src/lib/android-apk.ts` (Android → `/downloads/DRIP-CLIENT-OFFICIAL.apk`)
- Hub components:
  - `HubPageShell` (`maxWidth="lg"`)
  - Glass panels via `profileHeroStyles.glassPanel` (account / security / help) — no `HubHeaderBar` desk chrome
- Libs: `src/lib/auth/customer.ts`, `src/lib/currencies.ts`, `src/lib/prisma.ts`, `src/lib/settings.ts`, `src/lib/static-pages.ts`, `src/lib/web-push.ts`, `src/lib/feedback.ts` (`feedbackTap` / success·error; mute `drip-feedback-mute`; granular sound/haptic keys)
- Global interaction UX: `src/components/layout/interaction-feedback-provider.tsx`, `src/hooks/use-interaction-feedback.ts`, `src/hooks/use-web-push.ts`, `src/components/layout/web-push-prompt.tsx`, press CSS in `src/app/globals.css` (`.pressable` / data-slots)
- APIs: `GET /api/auth/me`, `PATCH /api/auth/profile` (name/avatar), `POST /api/auth/avatar`, `POST /api/auth/change-password`, `POST /api/auth/2fa/setup|enable|disable`, `GET /api/media/avatar/[id]`, `GET /api/push/public-key`, `POST /api/push/subscribe`, `POST /api/push/unsubscribe`
- Related: Premium → `/app/premium`; Become Seller → `/app/become-seller`; Help → `/faq`; static pages → `/pages/[slug]`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Shared shell rules: `app-console-shell.md`.
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only; use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- Customer session required; guests redirect to `/?auth=login&next=/app/profile`.
- Profile edits via Dialogs only (avatar/name/password/2FA) — not inline page forms.
- Install app row: Android downloads store-named APK; iOS/desktop use PWA prompt / help Dialog — not an inline form.
- Customization / share / username / vanity referral live on `/app/premium` — do not re-add here.
- Become a Seller CTA gated by program setting + USER role + min wallet microcents (`AppSetting`).
- Hero stage motion respects `prefers-reduced-motion` (static layers / no parallax).

## 3. Permitted Edit Scopes (Write Fields)
- `ProfileHeroStage` mesh / avatar / badges / Verified·2FA·Member chips; glass section layout; dialog fields for name/avatar/password/2FA, mute toggle.
- Premium CTA row → `/app/premium` (active badge when `isPremium`).
- FAQ & help row links to public `/faq`; active static page rows from `getActiveStaticPagesNav`.
- Do not change role/wallet here — admin/users or deposit flows own those.
