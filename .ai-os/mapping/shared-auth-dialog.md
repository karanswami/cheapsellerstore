# Feature Maps & Access Rules

## 1. File Inventory
- No page routes for login/register/forgot/2fa — dialog-only AuthDialog
- Components: `src/components/auth/auth-dialog.tsx` (+ `auth-dialog.module.css`), `auth-maintenance-notice.tsx`, `login-form.tsx`, `register-form.tsx`, `forgot-password-form.tsx`, `two-factor-form.tsx`, `google-button.tsx`, `auth-field.tsx`, `auth-provider.tsx`
- APIs: `src/app/api/auth/login/route.ts`, `register/route.ts` (optional `referralCode`), `logout/route.ts`, `me/route.ts`, `forgot-password/route.ts`, `reset-password/route.ts`, `change-password/route.ts`, `profile/route.ts`, `avatar/route.ts`, `google/route.ts`, `google/callback/route.ts`, `google/status/route.ts`, `native-handoff/route.ts`, `2fa/setup|enable|disable|verify/route.ts`
- Referral check: `GET /api/referrals/check?code=` (register live validate)
- Media: `src/app/api/media/avatar/[id]/route.ts`
- Libs: `src/lib/auth/customer.ts`, `src/lib/auth/session.ts` (and siblings under `src/lib/auth/`), `src/lib/auth/google.ts` (signed OAuth state + native handoff JWT), `src/lib/email.ts`, `src/lib/referral-utils.ts`, `src/lib/referrals.ts` (`resolveReferrerByCode`), `src/lib/referral-code.ts`
- Android: `android/.../MainActivity.java` (Custom Tabs for Google + `dripclient://oauth` → `/api/auth/native-handoff`), `AndroidManifest.xml` scheme intent-filter
- Proxy: `src/proxy.ts` — `/`, `/app/*`, `/admin/*`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- Money is USD microcents only (`1 USD = 100_000_000`); use `formatMoney` / `usdToMicrocents`; no FX.
- API envelope `{ data }` / `{ error: { code, message } }`.
- JWT cookie `drip_customer_session` `{ sub, role }`; admin uses same session with role ADMIN.
- Google requires `email_verified`; 2FA uses `drip_2fa_challenge` cookie.
- **Android Google OAuth:** APK opens Google in Chrome Custom Tabs (no WebView cookie share). OAuth `state` is a signed JWT with `native: true` (not a WebView-only cookie). Callback in Custom Tabs issues a short-lived handoff JWT and redirects `dripclient://oauth?token=` → MainActivity loads `GET /api/auth/native-handoff` in the WebView to set `drip_customer_session`. Browser/web OAuth unchanged (cookie session on callback).
- Never add `/login`, `/register`, or `/admin/login` pages.
- **Maintenance:** AuthDialog probes `GET /api/maintenance` on login/register open → warning Alert (`auth-maintenance-notice.tsx`) + updated dialog description. Google login/register fully off (status hides button; OAuth start/callback reject). Register submit locked (`maintenanceLocked`). Email/password Sign in still allows ADMIN only (API `maintenanceLoginBlock`; do not advertise bypass in UI).
- **Live session sync:** while logged in, `AuthProvider` polls `GET /api/auth/me` every **5s** (skips when tab hidden) and on `visibilitychange` / `focus`. Updates wallet balance, role, seller caps, avatar, etc. Toast on balance increase.
- **Session ended:** after a prior **server-confirmed** `/me` user, a later `/me` with `user: null` → redirect `/session-expired` (not a toast). Ban → `{ reason: "banned" }` → `/banned`. Mount/login races ignored via `serverSyncedRef` + `syncEpochRef` abort.
- Login success: `router.replace(destination)` only — **never** `router.refresh()` while URL is still `/?auth=*`.
- Proxy on `/?auth=login|register|forgot`: stay on `/` for the dialog; **do not** clear the session cookie (that wiped fresh logins). Orphan/banned JWTs cleared in `app`/`admin` layouts + `GET /api/auth/me`.
- Cookie clear (`clearCustomerSessionCookie`) must use the same `httpOnly` + `sameSite=lax` + `secure` (from `NEXT_PUBLIC_APP_URL`) + `path=/` attributes as set — expire via `maxAge: 0`.
- `GET /api/auth/me` wraps in try/catch: Prisma/transient failures → **503** and **keep** cookie; banned → `{ user: null, reason: "banned" }` + clear cookie; invalid JWT / deleted → `user: null` + clear cookie.

## 3. Permitted Edit Scopes (Write Fields)
- AuthDialog steps, form fields, Google button visibility (status API).
- Maintenance warning Alert + register lock when `maintenance_mode` is on (`auth-maintenance-notice.tsx` / AuthDialog probe).
- **Login title:** `siteName` from Site Config (`useSiteConfig`) — brand header + site logo mark.
- Register title: `Join {siteName}`; shared glass dialog chrome (`auth-dialog.module.css`).
- Google button: admin Settings Authentication Dialog (`google_client_id` / `google_client_secret`) with env fallback; `/api/auth/google/status`; status-loading skeleton; forward safe `?next=` and optional `?ref=` / `?referral=` code (stored in signed OAuth state for seamless auto-registration + referral attribution); polish only — no always-visible stub when unset. Native APK handoff via `dripclient://oauth` + `/api/auth/native-handoff` (do not set session cookies in Custom Tabs).
- Forgot-password OTP: Resend via admin Settings (`resend_api_key`, `resend_from_email`) with env fallback.
- Login / Register submit buttons stay disabled until `loginSchema` / `registerSchema` (+ terms + valid optional referral) pass.
- Optional register referral code field; URL prefill from `?ref=` / `?referral=` (AuthProvider opens register for guests).
- OTP/forgot via Resend; 2FA TOTP + backup codes UX.
- Forgot OTP reuse: while a code is unexpired/unused, `createPasswordResetOtp` returns `{ status: "reused" }` — route returns `reused: true` and **never** sends mail (plaintext is not stored). New mail only on `{ status: "created", code }`.
- Forgot + 2FA modes: outside click / Escape do not dismiss (X still closes); avoids losing OTP mid-flow.
- Live poll interval / visibility refresh behavior in `auth-provider.tsx` only.
