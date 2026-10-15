# README — AI-OS Human Checklist

Planning and core product are **shipped**. Use `.ai-os/STATUS.md` as the live pointer.

---

## Ready now

| Item | Status |
|------|--------|
| AI-OS docs (`.ai-os/*`) | ✅ Synced 2026-07-19 |
| `.cursorrules` | ✅ Active (SUB_SELLER, support, Dialog-only edits) |
| `.env` + `.env.example` | ✅ Includes Resend, Google, OpenRouter, Discord |
| `.env` gitignored | ✅ (`.env*` / `!.env.example`) |
| Next code task | See **Current Execution Pointer** in `.ai-os/todo.md` |

---

## Local / VPS boot

```bash
npm install
npm run db:generate
npm run db:push
npm run db:seed
npm run db:seed-support   # optional keyword routes
npm run dev               # :3102
```

- [ ] Dev server loads (local `http://localhost:3102` or VPS pm2)
- [ ] Assign at least one DB user `role=ADMIN` to open `/admin`
- [ ] Do **not** commit `.env`

Optional env:

| Var | Purpose |
|-----|---------|
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google sign-in |
| `OPENROUTER_API_KEY` | Support AI fallback |
| `DISCORD_WEBHOOK_URL` | Critical ticket alerts |
| `RESEND_API_KEY` / `RESEND_FROM_EMAIL` | Forgot-password OTP |

---

## Start building — paste this

```text
Read .ai-os/STATUS.md, system-prompt.md, todo.md, routes.md, architecture-map.md, features.md.
Execute the next unchecked task in todo.md (Current Execution Pointer).
After each completed task, update todo.md, routes.md, architecture-map.md, STATUS.md, and features.md.
```

---

## Locked decisions

| Decision | Value |
|----------|--------|
| Payment | `PAYMENT_MODE=manual` |
| Admin auth | Customer session with `User.role=ADMIN` (no separate admin login) |
| Currency | USD only (microcents: `1 USD = 100_000_000`) |
| Roles | `USER` \| `RESELLER` \| `SUB_SELLER` \| `ADMIN` |
| Support | Keyword router first; OpenRouter on weak match; persistent inbox |
| Admin edits | Dialog-only (no inline forms on list/settings pages) |

---

## What’s next (high level)

1. Re-enable admin Coming soon desks (Orders, Deposits, Flash sales, FAQs, …) — APIs/workspaces largely ready  
2. Referral / tasks customer UI  
3. Reseller wholesale price rules  
4. Seller API keys / auto-translate (deferred track)

Full checklist: `.ai-os/todo.md`
