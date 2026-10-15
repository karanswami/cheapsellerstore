# Feature Maps & Access Rules

## 1. File Inventory
- Route: `/admin/broadcast` — live
- Page: `src/app/admin/(panel)/broadcast/page.tsx` → `BroadcastWorkspace`
- Layout: `src/app/admin/(panel)/layout.tsx` → `AdminShell` + sidebar
- Components: `src/components/admin/broadcast/broadcast-workspace.tsx`
- Libs: `src/lib/broadcasts.ts`, `src/lib/notifications.ts` (`notifyMany` when Notify on), `src/lib/web-push.ts` (`broadcastWebPush` when Web Push on)
- APIs:
  - `GET/POST /api/admin/broadcast`
  - `PATCH /api/admin/broadcast/[id]` `{ active }`
  - `POST /api/admin/push/broadcast`
- Schema: `Broadcast` (`active`, `audience`, title/message/actionUrl), `PushSubscription`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Prisma only on server; client components never import `@/lib/prisma`.
- List rows read-only; create + activate/deactivate only inside Dialog.
- Publish creates pinned `Broadcast`; optional notify mirrors inbox notifications; optional Web Push dispatches native push notifications to browsers and devices.
- Customer surface: `/app/broadcast` shows active only.

## 3. Permitted Edit Scopes (Write Fields)
- Create Dialog (title, message, actionUrl, audience, notify switch, sendWebPush switch).
- Detail Dialog activate/deactivate.
- Do not put inline editors on the list page.
