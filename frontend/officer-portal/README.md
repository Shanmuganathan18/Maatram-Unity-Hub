# Maatram Officer Portal (MH26-03) – Frontend Prototype

React + Vite + JavaScript + Tailwind CSS · React Router · React Hook Form + Zod · Recharts · FullCalendar · Sonner · Lucide · Radix (dialog/switch).
**Frontend-only phase:** all data is fictional, in-memory and resets on reload. No backend, MySQL/Prisma, real Supabase Auth, or message delivery.
Student Portal and Admin Portal are separate apps and are not part of this project.

## Run
```bash
npm install
npm run dev      # http://localhost:5174
npm test         # zone-isolation + availability/event/attendance/report logic tests
npm run build
```
Demo officers (password `Demo@123`): `officer.a@maatram-demo.example` → **Zone A • Chennai**, `officer.b@maatram-demo.example` → **Zone B • Coimbatore**. The login page also has one-click demo buttons.
Developer tools (wrench button, demo only, `appConfig.demo.showDevTools`): switch demo officer, simulate the clock (window open / closes soon / locked), zone-isolation self-check, reset data. It is **not** a production zone switcher.

## Zone-based access model (critical requirement)
- One Officer Portal app for all zones. The only difference between officers is the data they may access.
- The session stores **only the officer id**. The zone is derived inside `src/services/zoneScopeService.js` from the officer account – never from a URL, query string, form field, request payload or React state. `createEvent` ignores any `zoneId` in the payload.
- Every list is zone-filtered; every lookup by id (student, institution, event, responses, attendance) returns **“not found” for another zone’s record** (IDOR-safe). Writes (status change, attendance, event creation with foreign institutions) throw `AccessError`.
- Search, filters, sorting, charts, calendar, reports and exports are all built on the scoped helpers, so no cross-zone rows can appear.
- **The frontend is not the security boundary.** In production the Node/Express backend must verify the Supabase JWT, load the officer’s zone, apply it to every Prisma query, validate zone ownership on every write, restrict exports, and write audit logs.

## Folder structure
`src/config` (deadline, permission switches, categories, workflow) · `src/data/mockData.js` (seeded generator, 2 zones) · `src/services/*` (the ONLY layer that touches data; swap for API calls) · `src/hooks` · `src/utils` · `src/components/{ui,layout,availability,calendar,events,students,…}` · `src/pages` (one per route) · `src/routes` · `src/layouts/OfficerLayout.jsx` · `src/__tests__`.
Components never import mock data; services take the officer id and resolve the zone themselves. Reads are synchronous, writes async (swap to promises when integrating).

## Modules
Dashboard (8 summary cards, stacked availability chart, institution heatmap, institution submission chart, participation trend, upcoming events, recent activity, quick actions) · Students (search, 4 filters, sorting, pagination, details, CSV import *validation preview only*) · Institutions (search/status/sort, details, charts) · Availability (week overview, best-date recommendation with explicit denominator, comparison by institution/year, trend; week details with date selector, student×day heatmap, date details, export preview CSV/Excel) · Calendar (month/week/agenda, availability density chips, events, response deadlines, attendance days, filters) · Events (list, 6-section create form with custom questions, capacity/waitlist, conflict warnings, status workflow, details, responses, physical-verification eligibility, reminder preview) · Attendance (individual + bulk marking, summary, history, printable sheet) · Reports (4 reports, filters, charts, CSV/Excel) · Notifications · Activity log (append-only) · Profile.

Availability states are kept distinct: Available, Unavailable, Not selected, Draft, Not submitted, System-assumed unavailable (+ Submitted/Locked week states). Availability ≠ event acceptance ≠ attendance.
Excel export is an HTML-table `.xls` (opens in Excel); a true `.xlsx` writer is a backend-phase item.

## How two officers are tested
Automated (`npm test`, 10 tests): lists/search/filters contain only own zone; other-zone ids return null; cross-zone writes rejected; client-supplied zoneId ignored; CSV exports/report exports contain no other-zone ids/institution names; dashboard totals equal scoped totals; availability denominators; physical-verification eligibility; attendance rules; workflow transitions.
Manual: log in as Officer A, note institutions/students; log out, log in as Officer B – same UI, different data. Try `/students/stu-b-0001` or `/events/ev-b-02` as Officer A → “not found”. Events created by A never appear for B.

## Client clarification register (safe defaults used)
All switches live in `src/config/appConfig.js` (`permissions`, rules). “Pending client confirmation” tags appear in the UI wherever a default is assumed.
1–4 student create/edit/deactivate, institution create/edit: **off** (view-only). 5–7 publish / approval / cancel / postpone: publish, cancel, postpone **on** with confirmations, approval **off** (`publishRequiresApproval`). 8–9 student response changes / officer override: override **off**. 10 physical-verification rule: *targeted + Available on event date* (assumption). 11 full day vs slots: **full-day** in this portal. 12 missed deadline: `systemAssumedUnavailable = true` (assumption; set false to keep “Not submitted”). 13 edit availability: **off**. 14 waitlist priority: *response time* placeholder; promotion by officer `canPromoteWaitlist` (assumption). 15–16 attendance statuses Present/Absent/Excused and officer may update, only while event is In Progress/Completed (assumption). 17–18 channels/announcements: in-app simulated only; announcements **off**. 19 bulk import: validation preview only. 20 report fields: prototype set. 21 multi-zone officers: **not supported** (one zone per officer).

## Conflicts / notes vs the original problem statement & Solution Document
- Solution Document says Zone 1 officers mainly *view* availability while Zones 2 & 3 can *create/assign* events; this spec gives every officer the same features. Implemented per this spec (same UI for all); event-creation rights per zone are one more item to confirm.
- Problem statement mentions SMS/WhatsApp reminders and a “confirmed-attendance list”: reminders are previews only; attendance is built.
- Problem statement says Office team can also see availability by time slot; this portal uses full-day availability (matches the Student Portal default).
- The Student Portal’s “Friday 6 PM” deadline is reused (`appConfig.deadline`), unconfirmed.

## PWA readiness / offline
Responsive app shell only. An offline banner warns that nothing is saved offline. Future: manifest + service worker, offline read-only cache, local drafts labelled “pending sync”, no silent submission.
