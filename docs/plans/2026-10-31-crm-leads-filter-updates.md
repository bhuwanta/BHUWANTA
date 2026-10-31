# CRM Leads Page Filter & WhatsApp Chat Fixes Implementation Plan

> **Goal:** Remove obsolete YouTube source filter, fix WhatsApp chat drawer message parsing (`(no text content)` issue), and restore chronological conversation ordering on `http://localhost:3000/crm/leads`.

**Date:** October 31, 2026  
**Status:** Completed & Verified on feature branch `feature/crm-leads-chat-and-filter-fixes`

---

### Executed Tasks Summary

#### 1. Phase 1: Remove YouTube Filter from CRM Leads
- **Target File:** [`src/app/(CRM_SOFTWARE)/crm/leads/LeadsClient.tsx`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/app/(CRM_SOFTWARE)/crm/leads/LeadsClient.tsx)
- **Modifications:**
  - Removed unused `YoutubeIcon` SVG definition.
  - Removed `<button onClick={() => toggleSourceFilter('youtube')}>` filter pill.
  - Active source buttons now cleanly align to `Meta`, `Website`, and `WhatsApp`.
  - Backend search query support in `actions.ts` remains backwards-compatible for historical queries.

#### 2. Phase 2: Chronological Chat Ordering & Auto-Scroll
- **Target Files:**
  - [`src/app/(CRM_SOFTWARE)/crm/leads/actions.ts`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/app/(CRM_SOFTWARE)/crm/leads/actions.ts#L294)
  - [`src/app/(CRM_SOFTWARE)/crm/leads/LeadsClient.tsx`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/app/(CRM_SOFTWARE)/crm/leads/LeadsClient.tsx#L206)
- **Modifications:**
  - Changed `getLeadActivities` sorting from `.order('created_at', { ascending: false })` to `.order('created_at', { ascending: true })` and `.order('id', { ascending: true })`.
  - Inverted conversation order is now corrected: incoming user messages and outgoing bot replies flow downwards naturally in timeline order.
  - Updated auto-scroll `useEffect` to trigger upon asynchronous loading of `whatsappActivities`, ensuring drawer opens directly at the newest message.

#### 3. Phase 3: WhatsApp Webhook & Multi-Payload Parsing
- **Target Files:**
  - [`src/lib/whatsapp/evidence.ts`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/lib/whatsapp/evidence.ts)
  - [`src/app/api/whatsapp/route.ts`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/app/api/whatsapp/route.ts#L166)
- **Modifications:**
  - Extended `incomingEvidence()` to inspect `message.button?.text`, `message.interactive.button_reply/list_reply`, `image.caption`, `document.filename`, `location.name/address`, and `referral` ad headlines.
  - Extended webhook `userInput` extractor in `route.ts` to support `message.type === 'button'`.

#### 4. Phase 4: UI Fallback Extraction for Historical Records
- **Target Files:**
  - [`src/app/(CRM_SOFTWARE)/crm/leads/LeadsClient.tsx`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/app/(CRM_SOFTWARE)/crm/leads/LeadsClient.tsx#L14)
  - [`src/app/(CRM_SOFTWARE)/crm/whatsapp/WhatsappDashboardClient.tsx`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/app/(CRM_SOFTWARE)/crm/whatsapp/WhatsappDashboardClient.tsx#L7)
- **Modifications:**
  - Upgraded `extractIncomingMessage` to fall back to `Selection:`, `WhatsApp referral:`, or `Type:` when `Message:` is `(no text content)`.
  - Historical database records now render as `Selected: Bangalore Highway` or `Ad Interaction (Click-to-WhatsApp)` instead of empty placeholders.

---

### Verification
- [x] Unused filter elements removed without breaking flex wrapping.
- [x] Sorting compound key (`created_at ASC`, `id ASC`) prevents same-second message collision.
- [x] `messagesEndRef` auto-scrolls down upon conversation load.
- [x] Fallback parsing preserves both legacy records and new Meta formats.
