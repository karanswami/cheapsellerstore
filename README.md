# Cheap Seller — Version 1.0

Digital key storefront (Mods / Tools / Spoofers) with customer hub, multi-rail wallet deposits, wallet checkout, and a full admin console.

**Live:** [https://cheapseller.store](https://cheapseller.store)  
**Legacy alias:** [https://drip-client.gurugaminghub.store](https://drip-client.gurugaminghub.store)  
**Android APK:** [Download v1.0.8](https://cheapseller.store/downloads/CHEAP-SELLER-v1.0.8.apk)

---

## Stack

| Layer | Tech |
|-------|------|
| App | Next.js 16 (App Router) · React 19 · TypeScript |
| UI | Tailwind 4 · shadcn/ui · dark-only |
| Data | Prisma 6 · MongoDB |
| Auth | jose JWT cookies · bcryptjs · optional Google OAuth · TOTP 2FA · Resend OTP |
| Runtime | PM2 on `:3102` · nginx + Let’s Encrypt |
| Mobile | Capacitor 7 Android WebView shell |

---

## Quick start (local)

```bash
cp .env.example .env   # fill DATABASE_URL + CUSTOMER_SESSION_SECRET (min 32 chars)
npm install
npm run db:generate
npm run db:push
npm run db:seed                 # optional baseline
npm run db:seed-support-bot     # support button tree
npm run db:seed-faqs
npm run db:seed-pages
npm run dev                     # http://localhost:3102
```

Admin access: register a user, then set `User.role = ADMIN` in Mongo (no separate admin login).

---

## Production deploy (this VPS)

App name: `cheapsellerstore` · port **3120** · cwd `/home/kscoder/cheapsellerstore`

```bash
# One-shot: deps → Prisma → build → PM2 restart
./deploy.sh
```

Manual equivalent:

```bash
npm install
npm run db:generate
npm run db:push
npm run build
pm2 startOrRestart ecosystem.config.cjs --only cheapsellerstore --update-env
pm2 save
```

### One-shot server setup (nginx + SSL + GitHub SSH)

```bash
sudo bash setup.sh
# installs nginx/certbot, proxies cheapseller.store (+ www) and
# drip-client.gurugaminghub.store → :3102, issues Let's Encrypt certs,
# ensures ~/.ssh ed25519 + known_hosts, sets git origin to SSH
```

### Deposit cron (every minute)

VPS crontab already runs `/home/kscoder/scripts/cron-deposits.sh`, which polls Cheap Seller at:

`http://127.0.0.1:3102/api/cron/deposits/poll` with `CRON_SECRET` from `.env`.

Project-local helper (Cheap Seller-only):

```bash
bash scripts/cron-deposits-poll.sh
```

### Required production env

See `.env.example`. Minimum for launch:

| Variable | Purpose |
|----------|---------|
| `DATABASE_URL` | MongoDB Atlas / replica set |
| `CUSTOMER_SESSION_SECRET` | JWT cookie (≥32 chars) |
| `NEXT_PUBLIC_APP_URL` | `https://cheapseller.store` (also pinned in `ecosystem.config.cjs`) |
| `CRON_SECRET` | Deposit poll auth |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Forgot-password OTP |
| Payment keys | Cashfree / Binance / RamaShop — or Admin → Settings → Payment API keys |

Never commit `.env`.

---

## What’s in Version 1

- Storefront browse → cart → wallet checkout → instant key delivery
- Auth: email/password, Google (optional), 2FA, forgot OTP
- Customer hub: store, wallet/deposits, keys, history, referral, premium, reports, broadcast, Platform API
- Deposits: Cashfree (INR), QRIS, Binance Pay, eSewa NPR, admin manual methods + proof
- Admin: full catalog, keys, promos, flash sales, users/sellers/resellers, special prices, logs, CMS, cron, Telegram notify
- PWA + Android release APK (Capacitor)
- Support: button-tree bot (no AI live desk)

**Deferred post-v1:** multi-language auto-translate (pt-BR).

---

## Useful scripts

| Script | What |
|--------|------|
| `sudo bash setup.sh` | nginx + SSL + GitHub SSH (one-shot VPS setup) |
| `./deploy.sh` | Production deploy on this VPS |
| `npm run android:setup` | One-time JDK 21 + Android SDK into `.tools/` |
| `./scripts/android-build-release.sh` | Signed APK → `releases/` |
| `npm run db:seed-support-bot` | Seed support tree |
| `npm run db:seed-faqs` / `db:seed-pages` | Seed FAQs / legal pages |

---

## AI-OS

Internal build docs live under `.ai-os/` (`STATUS.md`, `todo.md`, `routes.md`, `architecture-map.md`, `mapping/*`). Agents must sync those when shipping features.
