# Feature Maps & Access Rules

## 1. File Inventory
- Pages / chrome: `src/components/layout/support-chat.tsx`, `src/components/support/support-chat-thread.tsx`, `src/components/ui/message-scroller.tsx` (shared thread shell)
- Admin: `src/components/admin/settings/support-bot-settings.tsx` (Dialog CRUD inside Settings), `src/components/admin/settings/settings-workspace.tsx`
- APIs: `src/app/api/support/chat/route.ts` (GET entry + POST navigate), `src/app/api/support/inbox/route.ts`, `src/app/api/support/inbox/unread/route.ts`, `src/app/api/support/upload/route.ts` (deposit proof images only), `src/app/api/admin/support-bot/route.ts`, `src/app/api/admin/support-bot/[id]/route.ts`
- Core libs / schema: `src/lib/support-bot.ts`, `src/lib/support-keyboard.ts` (Telegram row layout), `src/lib/support-chat.ts`, `src/lib/support-inbox.ts`, `src/lib/notifications.ts`, `src/types/support.ts`, `prisma/schema.prisma` (`SupportBotStep`, `SupportInboxMessage`, legacy `SupportRoute`/`SupportTicket` read-only)
- Seed: `prisma/seed-support-bot.ts` (`npm run db:seed-support-bot`) — emoji labels + `row` keyboard layout

## 2. Hard Governance Rules (Read-Only Guardrails)
- Support is **button-tree only** — no OpenRouter, keyword router, guided deposit/key AI flows, or admin live-chat desk.
- `SupportBotStep` tree is admin-managed from **Settings → Support bot** (Dialog-only).
- Exactly one active `isEntry` step; free-text fallback uses `isFallback` step (or entry).
- User inbox persists bot + notification messages; clear wipes visible thread only.
- Notifications (`notifyUser`) still mirror into support inbox with unread FAB badge.
- Deposit proof upload reuses `POST /api/support/upload` → `/uploads/support/` (not chat attach UI).
- Customer support UI is a **floating chat panel** (not a full-page Vaul drawer): fixed card above the FAB, dim backdrop, `visualViewport` keyboard-safe frame, blur input on send.
- Thread auto-scrolls to end on every new message / typing state (button taps must keep new choices visible). Only the **latest** assistant step shows interactive choice buttons.
- Choice buttons render as a **Telegram-style keyboard**: `SupportBotButton.row` / `SupportButton.row` groups side-by-side; missing `row` auto-pairs topics 2-up with back/input full-width. Max **12** buttons/step. Do not dump all choices as a single vertical list.

## 3. Permitted Edit Scopes (Write Fields)
- Customer floating panel: button navigation, optional text fallback, notification display — no image attach in chat; layout/keyboard only in `support-chat.tsx`.
- Thread UX (`support-chat-thread.tsx`): MessageScroller + `ScrollToLatest`, Telegram keyboard via `layoutSupportKeyboard`, bubble polish — keep button-tree semantics.
- Admin Support bot Dialog: `slug`, `title`, `messageText`, `isEntry`, `isFallback`, `active`, `sortOrder`, `buttons` (`step`/`link`/`back`/`input` + optional `row`).
- Seed defaults: `npm run db:seed-support-bot` (full topic tree + emoji + rows); FAQs `npm run db:seed-faqs`; policies `npm run db:seed-pages`.
