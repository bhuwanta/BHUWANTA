# System Alerts & Production Monitoring Engine

## Goal
Build a dedicated CRM "Alerts" component where admins can configure alert recipient emails to receive tabular monitoring logs and instant failure notifications when external services (Meta WhatsApp, Meta Leads, Supabase, Resend) degrade or fail, ensuring silent outages are never missed.

## Tasks
- [x] Task 1: Create Supabase migration `20261107140000_system_alert_recipients.sql` with RLS policies and Redis fallback. → Verify: Migration file exists and syntax is valid.
- [x] Task 2: Create core monitoring engine `src/lib/monitoring/alerts.ts` with HTML table builder, Redis throttling, and Resend delivery. → Verify: Test script verifies HTML generation and throttling logic.
- [x] Task 3: Implement Server Actions in `src/app/(CRM_SOFTWARE)/crm/modules/actions.ts` (`getAlertRecipients`, `addAlertRecipient`, `updateAlertRecipient`, `removeAlertRecipient`, `triggerTestSystemAlert`). → Verify: Server actions execute cleanly with type safety.
- [x] Task 4: Build React UI component `src/app/(CRM_SOFTWARE)/crm/modules/components/Alerts.tsx` with recipients table, instant alert toggles, subsystem health badges, and one-click test trigger. → Verify: Component compiles with zero TypeScript errors.
- [x] Task 5: Mount `Alerts.tsx` in `ModulesClient.tsx` and `page.tsx`. → Verify: Props are passed and UI renders without warnings.
- [x] Task 6: Hook monitoring engine into `src/app/api/cron/leads-report/route.ts` and `src/app/api/cron/meta-sync/route.ts` to trigger tabular alerts and return accurate HTTP failure status on token expiration. → Verify: Meta 401 triggers alert payload and non-200 status code.
- [x] Task 7: Create unit tests in `tests/system-alerts-monitoring.test.mjs` and verify full test suite with `npm test` and `npx tsc --noEmit`. → Verify: All tests pass (0 failures, 0 type errors).

## Done When
- [x] Admins can view, add, edit, and delete alert recipient emails in CRM Modules > Alerts.
- [x] Admins can trigger a test alert email that delivers a styled tabular system health log to their designated inbox.
- [x] Meta WhatsApp token expiration (and similar external API failures) automatically triggers a tabular email alert to the alert recipient with clear remediation steps.
- [x] All unit tests pass and `npx tsc --noEmit` reports 0 errors on branch `feature/system-alerts-monitoring` (NOT merged to main).
