# Maatram Admin Portal (MH26-03) – Frontend Prototype

React + Vite + JavaScript + Tailwind CSS · React Router · React Hook Form + Zod · Recharts · Sonner · Lucide · Radix (dialog/switch).
**Frontend-only phase.** All data is fictional and in memory (resets on reload). No backend, MySQL/Prisma, real Supabase Auth, email/SMS/WhatsApp, backups or system monitoring. Student and Officer Portals are separate apps.

## Run
```bash
npm install
npm run dev      # http://localhost:5175
npm test         # 18 tests: permissions, validation, audit, calculations
npm run build
```
Mock admins (password `Demo@123`, or one-click buttons on the login page):
| Account | Role | What it demonstrates |
|---|---|---|
| super.admin@maatram-demo.example (Sunita Rao) | Super Admin | everything incl. roles, permissions, settings |
| admin@maatram-demo.example (Rajesh Menon) | Admin | operations; no role/permission edits, no settings edit, no audit export, no “announce to all”, no personal-data export, cannot deactivate zones |
| readonly.admin@maatram-demo.example (Kavitha Iyer) | Read-only / Auditor | view pages, reports/audit export; no write buttons |
The wrench button (demo only) switches accounts and the demo clock; disable via `appConfig.demo.showDevTools`.

## Permission model (mock)
- Catalogue + default role permissions: `src/config/permissions.js`. Live role permissions sit in the store and can be changed by a Super Admin on **/permissions** (staged → review → reason → confirm → history + audit).
- UI: navigation is filtered by permission; write actions are hidden (`<Can perm>`); direct URL access to a restricted page shows **Access denied** (`RequirePermission`).
- Services: **every** public service function calls `need(aid, permission)` (`src/services/accessService.js`) and throws `PermissionError`. Tests prove hidden UI is not the only barrier.
- Guards: Super Admin always keeps `roles.manage`; `roles.manage` cannot be given to other roles; you cannot change your own role/status; at least one active Super Admin must remain; `attendance.override` is off for every role by default.
- **This is not security.** In production the Node/Express backend must verify the Supabase token, load the admin’s role/permissions, and enforce them on every endpoint (including exports and search) to prevent IDOR and privilege escalation.

## Modules
Dashboard (10 cards, filters for date/zone/institution/category/year, zone comparison, weekly availability + trend, institution & event analytics, alerts, recent activity) · Zones (list, create, edit, activate/deactivate/archive with impact + confirmation, **no delete**) · Officers (list, create with simulated invitation – no passwords, edit, status, **zone reassignment workflow**, activity) · Institutions (list, create/edit, zone validation, zone change moves students, deactivate, no delete) · Students (list/filters, details, edit approved fields, correct institution mapping, bulk status/mapping with counts, **bulk CSV import preview**) · Users (unified accounts, bulk status with counts, role change for admins, login history mock) · Availability monitoring (week/date, filters, distinct states, **System → Zone → Institution → Student drill-down heatmap**, best dates with explicit denominator, zone/institution comparison, trend, export preview) · Events (list/filters, details, optional approval, postpone/cancel with reasons) · Attendance overview (by event/zone/institution, read-only unless override granted) · Reports (zone, student, availability, event, institution, officer *activity* – not ranking; CSV/Excel/PDF-print) · Import/Export Centre (import history, permission-gated exports, **data-quality monitor**) · Notifications · Announcements (mock publishing, audience authorization) · Support tickets (internal notes hidden from submitter) · Activity logs (append-only, filters, export) · Roles · Permissions · System settings (incl. mock health concept) · Profile.
Settings drive behaviour: availability deadline/assumed-unavailable rule and the event-approval switch change the calculations/UI immediately.
Excel export is an HTML-table `.xls`; a true `.xlsx` and real scheduled reports are backend-phase items.

## Folder structure
`src/config` (permissions, defaults) · `src/context` (Auth, Permission) · `src/data/mockData.js` · `src/services/*` (only layer touching data; swap for API calls) · `src/components/{ui,layout,…}` · `src/pages` · `src/routes` · `src/layouts/AdminLayout.jsx` · `src/__tests__`.

## Client clarification register (safe defaults used)
All items live as permissions/settings and are tagged “pending client confirmation” in the UI where assumed.
1 Super Admin count: ≥1 required, several allowed · 2 Admins creating admins: **no admin-creation UI** · 3 Admins changing roles/permissions: **off** (Super Admin only) · 4 Zone create/edit/deactivate: admin create+edit **on**, deactivate **off** · 5/6 officer multi-zone: **one zone**; reassignment needs `officers.reassign` · 7 student edit: approved fields only · 8 bulk import: **preview/simulation only** · 9 institution registration approval: not modelled · 10 institution deactivation: permission-controlled · 11 event approval: **optional, off** (Settings → Events) · 12 admin cancel/postpone: permission-controlled with reason · 13 admin editing availability: **not offered** · 14 attendance override: **off for all roles** · 15 mandatory reports: prototype set of six · 16 personal-data export: `students.export` (Super Admin only) · 17 audit contents: action, user, role, zone, record, time, description; no secrets · 18 announce to all: `announcements.send_all` (Super Admin only) · 19 channels: in-app only · 20 ticket handling: any admin with `support.manage` · 21 suspension rules: statuses exist, rules undefined · 22 retention: undefined · 23 settings editable by Admin: **none** · 24 health metrics: mock concept only.

## Conflicts / notes vs the original problem statement & Solution Document
- Solution Document describes the Administrator module as institutions, zones, global user governance and activity logs. This spec adds officers, announcements, support tickets, roles/permissions and settings – built as specified, marked as additions beyond the original statement.
- Problem statement says admins can “add or import students and institutions, manage roles, remove old data”. Implemented as add/import-preview, role management and **deactivate/archive instead of delete** (safer; deletion needs a client-approved process).
- Problem statement lists “three roles”; this spec proposes Super Admin / Admin / Read-only. Treated as a configurable proposal.

## PWA readiness / offline
Responsive shell only; an offline banner warns that nothing is saved offline. Future: manifest, service worker, offline read-only cache, drafts labelled “pending sync”.
