# WhatsApp CRM Report Single-Bubble Document Template Implementation Plan

> **For Claude / Antigravity:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Eliminate missing Excel reports and out-of-order delivery by migrating WhatsApp automated leads reports to a single Meta template with an integrated Document Header (`crm_leads_report_v2`), ensuring 100% reliable 24/7 delivery outside the 24-hour customer window.

**Architecture:** 
1. Register a Meta `UTILITY` message template with a `DOCUMENT` header (`crm_leads_report_v2`) in WhatsApp Manager.
2. In `src/app/api/cron/leads-report/route.ts`, upload the generated Excel workbook to Meta's `/media` endpoint and pass its `mediaId` directly inside the template's `header` component.
3. Eliminate the separate second `type: 'document'` API request, guaranteeing in-order, atomic delivery in one single bubble.
4. Maintain fallback handling if media upload fails or if testing free-form messages.

**Tech Stack:** Next.js (App Router), Meta WhatsApp Cloud API v19.0, Supabase SSR, SheetJS (xlsx).

---

### Why Solution A Solves Both Problems Permanently

| Problem Currently Observed | Root Cause in Current Architecture | How Solution A Solves It |
| :--- | :--- | :--- |
| **No Excel file arrives (text only)** | Meta blocks free-form messages (`type: 'document'`) when more than 24 hours have passed since the recipient messaged the bot (Error `131047`). | Template messages with Document Headers **bypass the 24-hour rule** and can be delivered 24/7/365. |
| **Excel arrives before the text** | The code fires two separate HTTP calls (text first, document second). Meta routes them through different internal carrier queues, leading to a race condition. | **Single atomic message:** The Excel sheet is the header of the template itself. They cannot physically arrive out of order. |

---

### Task 1: Meta Business Manager Template Setup

**Where:** Meta Business Manager > WhatsApp Manager > Message Templates  
*(Can also be created via Graph API if permissions allow)*

#### Template Specifications
- **Template Name:** `crm_leads_report_v2` (or updating existing `crm_leads_report`)
- **Category:** `UTILITY`
- **Language:** `English` (`en`)
- **Header:**
  - Type: **Document**
  - Sample File: Upload any sample `.xlsx` file (e.g. `leads_sample.xlsx`) for Meta approval.
- **Body Text:**
  ```text
  📊 Automated Bhuwanta CRM Report

  Report: {{1}}
  Generated: {{2}}
  Coverage Window:
  {{3}}

  {{4}}
  ```
- **Sample Values for Meta Approval:**
  - `{{1}}`: `9 AM Report (6 AM – 9 AM)`
  - `{{2}}`: `31/10/2026 at 09:00 am`
  - `{{3}}`: `31/10/2026, 06:00 am – 31/10/2026, 09:00 am`
  - `{{4}}`: `Total Leads in Slot: 3`

*(Note: Meta's automated AI system approves UTILITY templates within 2 to 5 minutes).*

---

### Task 2: Codebase Update in `src/app/api/cron/leads-report/route.ts`

**Files:**
- Modify: `src/app/api/cron/leads-report/route.ts:275-430`

#### Step 1: Extract Primary Excel Media ID
Currently, the route iterates through `excelAttachments` and pre-uploads them:
```ts
const excelAttachments = attachments.filter(a => a.filename.endsWith('.xlsx'));
const primaryExcel = excelAttachments[0];
const mediaId = primaryExcel ? uploadedMediaMap.get(primaryExcel.filename) : null;
```

#### Step 2: Inject Document Header Component into Template Payload
Update the `template` body from body-only to include the `header` component:

```ts
const templateComponents: any[] = [];

// 1. Add Document Header if Excel media is available
if (mediaId && primaryExcel) {
  templateComponents.push({
    type: 'header',
    parameters: [
      {
        type: 'document',
        document: {
          id: mediaId,
          filename: primaryExcel.filename
        }
      }
    ]
  });
}

// 2. Add Body Text Parameters
templateComponents.push({
  type: 'body',
  parameters: [
    { type: 'text', text: reportPeriod },
    { type: 'text', text: `${formattedCurrentDate} at ${formattedCurrentTime}` },
    { type: 'text', text: coverageWindowText },
    { type: 'text', text: leadCountsSummary }
  ]
});

// 3. Dispatch Single Atomic Template Message
const templateRes = await fetch(`https://graph.facebook.com/v19.0/${waPhoneId}/messages`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${waToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    messaging_product: 'whatsapp',
    to: phone,
    type: 'template',
    template: {
      name: process.env.WHATSAPP_REPORT_TEMPLATE_NAME || 'crm_leads_report_v2',
      language: { code: 'en' },
      components: templateComponents
    }
  })
});
```

#### Step 3: Remove Redundant Second `type: 'document'` API Call
Remove lines 407–435 (the standalone document loop) because the document is already delivered as part of the template. This saves an unnecessary API request and prevents duplicate deliveries.

---

### Task 3: Verification & Live Test Run

1. **Test Payload Execution:**
   Call the cron endpoint using test parameters:
   ```bash
   curl "http://localhost:3000/api/cron/leads-report?testWaPhone=91XXXXXXXXXX&testHour=12"
   ```
2. **Verify on WhatsApp:**
   - Confirm that a **single message bubble** arrives.
   - Confirm the Excel file is embedded directly in the header with the correct filename.
   - Confirm the report text is rendered directly below the Excel preview.
   - Verify that delivery works even when the recipient has not texted the bot in days.

---

### Task 4: Documentation & Changelog Update

- Record changes in `change log/CHANGELOG.md`.
- Ensure environment variable `WHATSAPP_REPORT_TEMPLATE_NAME` defaults to `crm_leads_report_v2` with fallback to `crm_leads_report`.

