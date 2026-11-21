# Maatram Student Portal (MH26-03) – Frontend Prototype

React + Vite + JavaScript + Tailwind CSS · React Router · React Hook Form + Zod · Sonner · Lucide · FullCalendar · Radix (dialog/switch).
**Frontend-only phase:** all data is fictional and in-memory. No backend, MySQL/Prisma or real Supabase Auth. No real email/SMS/WhatsApp is sent.

## Run
```bash
npm install
npm run dev      # http://localhost:5173
npm test         # unit tests for deadline, availability, events, conflicts, ICS
npm run build
```
Demo login: choose a demo student on the login page, or sign in manually with e.g. `ananya.demo@example.org` / `MF-2024-8842` and password `Demo@123`.

## Developer tool (demo only)
The wrench button (bottom-right) opens **Developer tools**: simulate the clock (open / closes soon / locked / next week), switch mock accounts, reset data. Disable via `appConfig.demo.showDevTools = false`. Default demo clock: **Wed 4 Nov 2026, 10:00 IST**. Data resets on page reload.

## Folder structure
`src/config` (deadline, slots, flags) · `src/data/mockData.js` (all fictional data) · `src/services` (the ONLY layer touching data – swap for API calls later) · `src/hooks` · `src/utils` · `src/components/{ui,layout,dashboard,availability,calendar,events,notifications}` · `src/pages` · `src/routes` · `src/layouts`.

## Spec coverage (summary)
- Routes: /login, /dashboard, /availability, /calendar, /events, /events/:eventId, /responses, /notifications, /availability-history, /settings/notifications, /profile, /help, 404; protected routes redirect to /login.
- Weekly availability: week navigation, multi-date Free/Busy/Not selected, optional time slots, Repeat Previous Week (weekday mapping, confirm, undo), templates (save/apply/rename/delete, never auto-submitted), draft/submit/update/lock, mark-all-unavailable (confirm), reset, edit history, countdown, deadline simulation, **System-Assumed Unavailable distinct from explicit Unavailable** (a draft is never a submission).
- Calendar (own availability only, legend with icons+text), history (filters, details, read-only locked), event list/filters/calendar, event details with per-event custom questions, accept/decline/withdraw with confirmation, decline reason, conflict warnings (time vs date-level), physical-verification eligibility (separate service), response history, feedback for completed events.
- Notifications (filters, read/unread, deep links), preferences (only configured channels, required notices locked on in-app), profile edit (phone, alt email, photo; assigned fields read-only), completeness indicator, Help/FAQ, CSV + print + ICS export.
- **Availability and event response are separate**: Event details shows the availability status for the event date and states it does not accept the invitation.

## Prototype assumptions (need client confirmation)
Friday 6:00 PM IST deadline in the *same* week being planned (`deadline.weekOffset`, set -1 for the Friday before); slot names/ranges; empty slots on an available date = whole day; which notices are mandatory; reminder cadence (example only); decline-reason/withdraw rules per event (mock config); policy banner wording.

## PWA / offline drafts – later enhancement (not implemented)
Only an honest offline banner is shown. Later: manifest + service worker, offline read-only cache, local draft with explicit "Pending sync" state, conflict resolution, no silent submission, avoid storing sensitive data locally.

## Backend integration notes
Replace functions in `src/services/*` with API calls (reads currently sync, writes async). Backend must enforce identity, availability ownership, window open/closed, event targeting/eligibility, and response permissions; frontend checks are UX only. Auth: Supabase Auth (email/password + Google) → backend verifies token → maps to MySQL student.
