# 📊 Bhuwanta CRM — System Monitoring & Failure Alerts Guide

## 1. Overview & Purpose

### The Problem It Solves
During production operations, external APIs (such as Meta WhatsApp Cloud API, Meta Ads Lead Gen, Supabase, and Resend) can experience authentication revocation, rate limiting, or network disconnects. 

A prime example occurred when Meta invalidated the WhatsApp Access Token with `OAuthException: Code 190 (Subcode 467 - User logged out)`. Because `fetch()` in Node.js does not throw an exception on HTTP 401, standard crash-monitoring tools like Sentry did not trigger an alert, and the cron endpoint returned `HTTP 200`, meaning external cron schedulers (like `cron-job.org`) saw every run as "Green". As a result, automated WhatsApp leads reports stopped arriving for a week without anyone being alerted.

### The Solution: Domain-Level Health Observability
This module introduces an active health and error interception layer:
1. **Zero Silent Failures**: Any third-party authentication failure or sync error triggers an immediate structured alert.
2. **Dedicated Inbox Routing**: Alerts are sent exclusively to designated engineer/admin emails, completely decoupled from customer lead notifications.
3. **Tabular Monitoring Digest**: Information is presented in a clean, human-readable HTML table rather than raw developer stack traces.
4. **Accurate HTTP Statuses**: Failed cron deliveries return `HTTP 502 Bad Gateway` to turn external uptime monitors Red immediately.

---

## 2. Managing Alert Recipients (Add, Edit, Delete)

The module is managed inside **CRM > Modules > System Monitoring & Failure Alerts**:

### A. How to Add a Recipient
1. Click the **`+ Add Alert Email`** button in the top right of the module header.
2. Enter the **Recipient Name** (e.g. `S Santosh` or `Lead DevOps`).
3. Enter the **Email Address** (e.g. `santosh@gmail.com`).
4. Select the notification preferences:
   * **Instant Critical Alerts (Recommended)**: Receive immediate notifications whenever an external service fails (Meta 401, DB connection drops).
   * **Tabular Cron Digest**: Receive periodic structured summary tables of cron executions.
5. Click **`Add Recipient`**. The email will immediately be saved to the database and synced to Redis.

### B. How to Edit a Recipient
1. In the recipient table, click the **Pencil Icon (`Edit`)** in the target row.
2. Update the name or toggle the **Instant Alerts** / **Tabular Digest** checkboxes.
3. Click **`Save`**.

### C. How to Delete a Recipient
1. In the recipient table, click the **Trash Icon (`Delete`)**.
2. Confirm removal. The recipient will stop receiving alerts.
> **Note on Master Default**: The master admin email (`bhuwanta9@gmail.com`) is protected against deletion to prevent the system from entering an alert-less state.

---

## 3. What Information Is Sent in Alerts?

When an alert triggers, designated recipients receive a responsive HTML email featuring a structured 5-column operational table:

| Column | Description | Example |
| :--- | :--- | :--- |
| **Timestamp (IST)** | Exact date and time the probe or cron ran in Indian Standard Time (`+05:30`). | `07 Nov 2026, 01:30 PM` |
| **Subsystem** | The exact service or cron being probed. | `Meta WhatsApp Cloud API`, `Meta Ads Sync`, `Supabase PostgreSQL`, `Resend Mailer` |
| **Severity Status** | Visual status badge: `✅ HEALTHY`, `⚠️ WARNING`, or `🚨 CRITICAL`. | `🚨 CRITICAL` (Token Revoked) |
| **Operational Details** | Technical diagnostics, HTTP status codes, and Meta/database error trace IDs. | `HTTP 401: OAuthException: Code 190, Subcode 467. User session expired.` |
| **Action Required** | Clear, step-by-step instructions on how to resolve the issue. | `Generate a Permanent System User Token in Meta Business Suite and update WHATSAPP_ACCESS_TOKEN in Vercel.` |

---

## 4. How Spam Protection & Redis Cooldown Works

If a cron job runs every 15 minutes and an API token is invalid, naive alert systems would send **96 duplicate emails every single day**, creating alert fatigue.

### The Upstash Redis Cooldown Lock:
* When a critical error triggers an alert, the engine acquires a temporary incident lock in Upstash Redis (e.g., `crm:alert_cooldown:wa-leads-report-auth-401`) with a **2-hour Time-to-Live (TTL)**.
* You receive an immediate alert on the **first failure**.
* Subsequent identical failures within the 2-hour window are suppressed.
* If the issue remains unresolved after 2 hours, a single reminder is dispatched.
* **Manual Tests**: Clicking the **`Test Alert`** button in the CRM UI always bypasses the cooldown so you can test delivery anytime.

---

## 5. How to Test the System

You can test the entire pipeline with one click:
1. Go to **CRM > Modules**.
2. Find your email row in the **Designated Alert Recipients** table.
3. Click **`Test Alert`**.
4. A live sample monitoring report simulating subsystem checks will immediately be generated and delivered to your inbox via Resend.
5. A confirmation toast will appear: *"Test alert email successfully sent to 1 recipient(s). Please check your inbox!"*

---

## 6. Monitored Subsystems Reference

The module actively monitors four critical production pillars:

1. **Meta WhatsApp Cloud API**:
   * Probes outgoing WhatsApp message delivery.
   * Catches token expirations (Code 190 / Subcode 467) and template approval rejections.
2. **Meta Ads Leads Sync**:
   * Tracks `/api/cron/meta-sync` form lead ingestion.
   * Alerts if lead forms return permission or page token errors.
3. **Resend Mail Engine**:
   * Verifies transactional email sending for automated Excel/PDF daily reports.
   * Checks DKIM/SPF domain authorization.
4. **Supabase & Upstash Redis**:
   * Measures database connection pool latency and Redis session cache responsiveness.

