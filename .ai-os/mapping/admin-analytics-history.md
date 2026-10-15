# Feature Maps & Access Rules

## 1. File Inventory
- Pages: `src/app/admin/(panel)/history/page.tsx`, `src/app/admin/(panel)/statistics/page.tsx`, `src/app/admin/(panel)/analytics/page.tsx`
- Workspaces: `src/components/admin/history/history-workspace.tsx`, `src/components/admin/statistics/statistics-workspace.tsx`, `src/components/admin/analytics/analytics-workspace.tsx`, `src/components/admin/overview/overview-workspace.tsx`
- APIs: `src/app/api/admin/history/route.ts`, `src/app/api/admin/statistics/route.ts`, `src/app/api/admin/analytics/route.ts`
- Core libs / schema: `src/lib/history.ts`, `src/lib/admin-stats.ts`, `src/types/admin-stats.ts`, `src/lib/prisma.ts`

## 2. Hard Governance Rules (Read-Only Guardrails)
- Analytics and history are read-only operational surfaces.
- Money and event series must reflect the USD microcents backend model.
- Charts and KPIs are server-derived; no client-invented aggregates.

## 3. Permitted Edit Scopes (Write Fields)
- Pages may change filter tabs, chart ranges, and detail-dialog visibility.
- Admin history dialogs may inspect events and linked entities, but not edit aggregate data.
- Any export or drill-down must stay read-only unless delegated to the owning domain route.
