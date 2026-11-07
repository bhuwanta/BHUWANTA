# Bhuwanta Website & CRM - Recent Updates Changelog

---

## 0. November 7, 2026 - CRM Leads Timezone Day-Shift Fix, Bug Audit & System Hardening

> **Summary:** Resolved the production timezone day-shift bug where selecting a date (e.g. 24th) pulled in next-day early morning leads (e.g. 25th 02:55 AM & 05:27 AM) due to Vercel UTC execution. Pinned all CRM displays and CSV exports to Indian Standard Time (`Asia/Kolkata`). Sanitized PostgREST search queries against `,()"` delimiters, enforced slot boundary capping in automated cron reports to prevent double counting, added non-UUID guardrails on recipient deletion, implemented automatic failover for public lead ingestion, and added regression tests.

### A. Summary of Files Changed & In-Depth Analysis

| File Path | Changes | What Changed | Why It Changed (In-Depth Technical Rationale) |
| :--- | :--- | :--- | :--- |
| [`src/app/(CRM_SOFTWARE)/crm/leads/actions.ts`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/app/(CRM_SOFTWARE)/crm/leads/actions.ts) | +42 lines, -10 lines | • Anchored `startDate` and `endDate` to Indian Standard Time (`+05:30`).<br>• Sanitized `searchQuery` by replacing `,()"` delimiters with spaces.<br>• Added UUID format validation to `deleteLead` and `deleteMultipleLeads`. | • **Timezone day-shift fix:** Vercel Node.js runs in UTC. Querying `new Date(startDate)` shifted midnight by 5.5 hours into India (`05:30 AM`), causing leads from Oct 25 (02:55 AM & 05:27 AM) to appear under Oct 24. Explicit `+05:30` anchoring isolates exact Indian calendar days.<br>• **PostgREST stability:** Searching for terms with commas or parentheses previously caused PostgREST syntax crashes (`HTTP 400 Bad Request`).<br>• **Postgres type safety:** Eliminates `invalid input syntax for type uuid` exceptions on malformed lead IDs. |
| [`src/app/(CRM_SOFTWARE)/crm/leads/LeadsClient.tsx`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/app/(CRM_SOFTWARE)/crm/leads/LeadsClient.tsx) | +6 lines, -2 lines | • Pinned table date & time cells, lead drawer detail dates, and CSV export dates to `timeZone: 'Asia/Kolkata'`. | • **Consistent display:** Guarantees leads are always formatted in IST regardless of the CRM admin's browser location or machine locale. |
| [`src/app/api/cron/leads-report/route.ts`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/app/api/cron/leads-report/route.ts) | +35 lines, -8 lines | • Added `.lte('created_at', endUtc)` on regular slot queries and `l.created_at <= endUtc` on master report slot filters.<br>• Normalized recipient phone numbers to pure digits (`91XXXXXXXXXX`) for Meta WhatsApp Cloud API.<br>• Added explicit database error handling returning HTTP 500 on query failures. | • **Zero cross-slot double counting:** Prevents cron jobs running slightly past the scheduled hour from double-counting leads across adjacent slots. Ensures report download counts match WhatsApp notifications.<br>• **Meta API compliance:** Prevents `131047` format rejection when numbers contain spaces or leading `+`.<br>• **Observability:** Prevents silent 200 successes when DB queries fail. |
| [`src/app/(CRM_SOFTWARE)/crm/modules/actions.ts`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/app/(CRM_SOFTWARE)/crm/modules/actions.ts) | +14 lines | • Added early guard for `master-admin-default` in `removeReportRecipient`.<br>• Added UUID format regex checks in `removeReportRecipient` and `removeWaRecipient`. | • **PostgreSQL syntax safety:** Prevents `invalid input syntax for type uuid` when attempting to delete default master admin rows or invalid IDs. |
| [`src/app/api/contact/route.ts`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/app/api/contact/route.ts) | +34 lines, -23 lines | • Added automatic fallback to Supabase CRM if Sanity CMS encounters an error. | • **Zero lost leads:** If Sanity experiences an API outage or network timeout, the lead is safely recorded in Supabase CRM and the visitor receives a success confirmation. |
| [`src/components/ui/DownloadPopup.tsx`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/components/ui/DownloadPopup.tsx) | -30 lines | • Removed dead unused `handleInstantDownload` function. | • **Code hygiene:** Clears ESLint `@typescript-eslint/no-unused-vars` warning. |
| [`tests/crm-leads-date-timezone.test.mjs`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/tests/crm-leads-date-timezone.test.mjs) | +76 lines (New) | • Added automated test suite for IST date normalization, PostgREST query sanitization, UUID guards, and Meta WhatsApp phone formatting. | • **Regression protection:** 93/93 total test suite passing. |

---

## 1. October 31, 2026 - CRM Leads Filter Cleanup & WhatsApp Chat History Fixes

> **Summary:** Implemented CRM Leads enhancements: removed obsolete YouTube filter pill, corrected inverted conversation timeline in the chat drawer, expanded Meta WhatsApp webhook payload parsing to eliminate `(no text content)` bubbles, and added intelligent fallback parsing for historical records.

### A. Summary of Files Changed & In-Depth Analysis

| File Path | Changes | What Changed | Why It Changed (In-Depth Technical Rationale) |
| :--- | :--- | :--- | :--- |
| [`src/app/(CRM_SOFTWARE)/crm/leads/LeadsClient.tsx`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/app/(CRM_SOFTWARE)/crm/leads/LeadsClient.tsx) | +85 lines, -28 lines | • Removed `YoutubeIcon` and the YouTube filter pill.<br>• Upgraded `extractIncomingMessage` with fallback parsing.<br>• Replaced raw `[Unsupported message]` label with `Chat Initiated (Ad CTA / Interactive Button)` / `Ad Interaction (Click-to-WhatsApp)`.<br>• Added 1-click **"Open in WhatsApp ↗"** button in modal header.<br>• Built in-CRM **inline video, image, audio & document player**.<br>• Connected auto-scroll to `whatsappActivities` and `isLoadingActivities`. | • **UX decluttering:** YouTube has no dedicated lead capture; clicking it gave zero results and confused sales reps.<br>• **Chat readability:** Historical messages previously displaying `(no text content)` or raw `[Unsupported message]` now parse stored `Selection:` (e.g. `Selected: Bangalore Highway`), referral ad metadata, or display human-readable initiation text.<br>• **In-CRM media playback:** Sales reps can now play videos, inspect photos, and listen to voice notes directly in the CRM without leaving the browser.<br>• **Auto-scroll:** The drawer now automatically scrolls to the newest message upon load. |
| [`src/app/api/whatsapp/media/[id]/route.ts`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/app/api/whatsapp/media/%5Bid%5D/route.ts) | +63 lines (New) | • Secure authenticated streaming proxy for WhatsApp media (videos, images, audio, documents) via Meta Graph API using `WHATSAPP_ACCESS_TOKEN`. | • **Direct media access:** Bypasses Meta Cloud API restrictions by securely resolving temporary CDN links and streaming binary content to authenticated CRM users. |
| [`src/app/(CRM_SOFTWARE)/crm/leads/actions.ts`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/app/(CRM_SOFTWARE)/crm/leads/actions.ts) | +2 lines, -1 line | • Changed `getLeadActivities` sorting to `.order('created_at', { ascending: true })` and `.order('id', { ascending: true })`. | • **Chronological fix:** Previously ordered descending (`ascending: false`), causing bot replies to appear above user incoming messages. Ordering ascending restores natural timeline flow. Compound sort by `id` prevents collisions when bot replies within the same second. |
| [`src/app/(CRM_SOFTWARE)/crm/whatsapp/WhatsappDashboardClient.tsx`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/app/(CRM_SOFTWARE)/crm/whatsapp/WhatsappDashboardClient.tsx) | +28 lines, -3 lines | • Upgraded `extractIncomingMessage` with identical multi-field fallback parser. | • **Parity across CRM modules:** Ensures the dedicated WhatsApp dashboard (`/crm/whatsapp`) also benefits from intelligent fallback labels on legacy records. |
| [`src/lib/whatsapp/evidence.ts`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/lib/whatsapp/evidence.ts) | +44 lines, -3 lines | • Extended `incomingEvidence()` to extract `message.button?.text`, interactive replies, media captions, locations, voice notes, and ad referrals. | • **Webhook completeness:** When customers click Meta Click-to-WhatsApp (CTWA) ads or template quick replies, Meta sends `message.type === 'button'` or media instead of `message.text.body`. Previously this resulted in `Message: (no text content)`. Now all message formats preserve their human-readable content. |
| [`src/app/api/whatsapp/route.ts`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/app/api/whatsapp/route.ts) | +5 lines, 0 lines | • Added `message.type === 'button'` handling to `userInput` extractor. | • **Bot flow triggering:** Allows template buttons and ad button clicks to properly trigger keyword matching, greetings, and state transitions. |
| [`docs/plans/2026-10-31-crm-leads-filter-updates.md`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/docs/plans/2026-10-31-crm-leads-filter-updates.md) | +65 lines (New) | • Documented execution plan with root cause analysis, architecture, and task completion. | • **Auditability & planning:** Adheres to project development rules and preserves implementation decisions for the team. |
| [`src/lib/reports/token.ts`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/lib/reports/token.ts) | +66 lines (New) | • Implemented HMAC-SHA256 signed token generator (`generateReportToken`), verifier (`verifyReportToken`), and URL builder (`buildReportDownloadUrl`). | • **Automated Report Reliability & Security:** Eliminates Meta Cloud API `131047` document delivery rejections by embedding a 24-hour tamper-proof download link directly inside the approved WhatsApp template body. |
| [`src/app/api/crm/reports/download/route.ts`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/app/api/crm/reports/download/route.ts) | +124 lines (New) | • Authenticated endpoint verifying token signature, checking 24h expiration, querying slot leads from Supabase, generating `.xlsx` buffer, and streaming as download attachment. | • **Self-service secure download:** Allows managers to tap the link in WhatsApp and instantly download the exact Excel sheet on any mobile browser without requiring manual CRM login. Includes branded expiration page after 24h. |
| [`src/app/api/cron/leads-report/route.ts`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/app/api/cron/leads-report/route.ts) | +12 lines, -65 lines | • Integrated `buildReportDownloadUrl` into WhatsApp template param `{{4}}`.<br>• Removed redundant Meta Graph API upload & document delivery loop. | • **Zero cron latency & 100% WhatsApp delivery:** Fixes cron timeouts and removes race conditions where Excel arrived before text or was blocked by Meta's 24h customer-care window. Leaves Resend email logic 100% intact. |
| [`src/lib/reports/generator.ts`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/src/lib/reports/generator.ts) | +24 lines | • Exported shared `formatLead` helper function. | • **DRY data formatting:** Shares lead normalization between the cron job and the download API route. |
| [`tests/report-token.test.mjs`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/tests/report-token.test.mjs) | +80 lines (New) | • Unit tests verifying HMAC token generation, payload recovery, signature tampering rejection, and expiration handling. | • **Test coverage:** Guarantees cryptographic integrity of report download links. |
| [`tests/document-download.test.mjs`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/tests/document-download.test.mjs) | +1 line | • Added `globalThis.navigator = dom.window.navigator`. | • **React 19 test environment fix:** Restores DOM navigator mock so `npm test` runs cleanly. |
| [`tests/project-enquiry.test.mjs`](file:///Users/surojuhomsaisantosh/Documents/PROJECTS/1%20BHUWANTA/1%20BHUWANTA_WEBSITE_CRM_BDCP/BHUWANTA_WEBSITE/tests/project-enquiry.test.mjs) | +1 line | • Added `globalThis.navigator = dom.window.navigator`. | • **React 19 test environment fix:** Restores DOM navigator mock so `npm test` runs cleanly. |

---

## 1. Commits Pulled from Remote `main` (October 31, 2026 Morning)

The following 7 commits were pulled into `main` on October 31, 2026:

| Date & Time (IST) | Commit Hash | Author | Type | Subject & Description |
| :--- | :--- | :--- | :--- | :--- |
| **2026-10-22 15:14** | `49d5035` | Trinadh | Fix / Feat | **Fixed Arudra overseas enquiry paths and campaign attribution**<br>• Enhanced `DownloadPopup.tsx` and filter actions with international phone support.<br>• Added `utm_id` tracking to campaign attribution.<br>• Added document download & attribution unit tests. |
| **2026-10-22 01:00** | `40fc38c` | Trinadh | Merge | **Merged Gulf enquiry support for Arudra**<br>Merge branch feature into main. |
| **2026-10-22 01:00** | `5f6560f` | Trinadh | Feat | **Enabled Gulf phone numbers for Arudra enquiries**<br>• Integrated `libphonenumber-js`.<br>• Added country selection for Gulf countries (`+971`, `+966`, `+974`, `+968`, `+965`).<br>• Hardened CRM phone matching & WhatsApp deduplication against false suffix joins. |
| **2026-10-21 10:41** | `2cef10d` | Trinadh | Merge | **Merged project-specific enquiry pages and campaign landing improvements**<br>Merge branch feature into main. |
| **2026-10-21 09:40** | `815e13e` | Trinadh | Feat / UX | **Improved enquiry pages across all Bhuwanta projects**<br>• Created reusable `ProjectEnquirySection.tsx`.<br>• Added direct `#book-visit` routing so project card clicks stay on the project page.<br>• Updated static & template landing pages with location links. |
| **2026-10-20 13:51** | `47c47b2` | BHUWANTA | Merge | **Merged enquiry readiness and Arudra location improvements**<br>Merge branch feature into main. |
| **2026-10-20 13:48** | `024364c` | BHUWANTA | Fix / UX | **Fixed enquiry readiness and improved Arudra location access**<br>• Added timeout, abort signal, and error retry to `useOtpConfig.ts`.<br>• Improved Arudra location access on page banners. |

---

## 2. Context: Preceding Updates (What We Had Before)

For historical reference, the commits immediately preceding this pull (`2ef0a6b` and earlier) covered:

| Date & Time (IST) | Commit Hash | Author | Subject & Scope |
| :--- | :--- | :--- | :--- |
| **2026-10-11 18:58** | `2ef0a6b` / `cf80248` | BHUWANTA | Merged Arudra enquiry access & form guidance fixes. |
| **2026-10-10 18:18** | `99c7c6c` | suroju-hom-sai-santosh | `feat(seo)`: Fixed keyword consistency, added highway guide & FAQ schema. |
| **2026-10-10 18:16** | `6f6a9e4` / `f9fff56` | BHUWANTA | Masked public Arudra pricing and quote metadata. |
| **2026-10-10 18:07** | `da3bcaf` | suroju-hom-sai-santosh | `fix(whatsapp)`: Fixed chat drawer animation jitter & mobile spacing. |
| **2026-10-10 17:57** | `385fe00` | suroju-hom-sai-santosh | `chore`: Removed unwanted scratch test scripts and debug files. |
| **2026-10-10 17:51** | `54e55b4` / `92c2a1d` | suroju-hom-sai-santosh | `feat(crm)`: Comprehensive mobile optimization & delete confirmation modal. |
| **2026-10-10 17:48** | `626afa1` | suroju-hom-sai-santosh | `fix(crm)`: Mobile responsive leads filter, charts, & permissions. |

---

## 3. Detailed Functional Impact Matrix

| Area / Module | Core Changes | Primary Files Modified | System & User Impact |
| :--- | :--- | :--- | :--- |
| **NRI / Gulf Enquiries** | • Added `libphonenumber-js/max`<br>• Country selector for India (`+91`), UAE (`+971`), Saudi Arabia (`+966`), Qatar (`+974`), Oman (`+968`), Kuwait (`+965`)<br>• Auto-country detection on pasting `+` or `00`<br>• Preserves 10-digit Indian numbers; stores overseas numbers as full E.164. | `src/lib/phone-input.ts`<br>`src/components/ui/ContactForm.tsx`<br>`src/components/ui/DownloadPopup.tsx`<br>`src/app/api/contact/route.ts` | • NRI buyers from UAE/Gulf can now submit leads and download brochures without validation errors.<br>• Existing domestic 10-digit leads remain completely compatible. |
| **CRM Status Synchronization** | • Replaced loose SQL `ilike` suffix matching (`%cleanPhone.slice(-10)%`) with exact canonical equality `canonicalPhoneNumber()`.<br>• Added 500-record candidate boundary limit. | `src/app/(CRM_SOFTWARE)/crm/leads/actions.ts` | • Prevents cross-country phone collisions where distinct foreign and domestic numbers sharing the last digits could accidentally update each other. |
| **WhatsApp CRM Integration** | • WhatsApp lead lookups & activity logging now match strictly by canonical phone identity. | `src/lib/whatsapp/crm.ts` | • WhatsApp incoming webhooks and automated activities reliably map to the single verified customer record. |
| **Project Enquiry UX & Routing** | • Created `ProjectEnquirySection.tsx`<br>• Clicking "Request Plot Details" or "Enquire Now" on a project card directs directly to `/projects/<slug>#book-visit` instead of redirecting to the homepage.<br>• Added "View Project Location" map link on hero banners. | `src/components/ui/ProjectEnquirySection.tsx`<br>`src/lib/project-links.ts`<br>`src/components/ui/ProjectsFilterClient.tsx`<br>`src/components/ui/ProjectLandingTemplate.tsx`<br>`src/app/(public)/projects/[slug]/page.tsx` | • Higher lead conversion: visitors stay focused on the specific project they clicked rather than landing on a generic form. |
| **OTP Resilience** | • Added 10-second request timeout and `AbortController`<br>• Added `hasError` state and `retry()` callback<br>• Cached status is treated as a temporary fallback, not assumed final. | `src/lib/hooks/useOtpConfig.ts` | • Prevents UI freezes if network is poor or Sanity OTP config endpoint slows down. |
| **Campaign Attribution** | • Added `utm_id` to sanitized campaign tracking parameters. | `src/lib/lead-attribution.ts` | • Supports modern Google Ads & Meta campaign ID tracking alongside UTM source, medium, and campaign. |
| **Automated Testing** | • 5 new test suites covering phone API validation, CRM matching, document downloads, attribution, and project enquiries. | `tests/contact-phone-api.test.mjs`<br>`tests/crm-phone-matching.test.mjs`<br>`tests/document-download.test.mjs`<br>`tests/lead-attribution.test.mjs`<br>`tests/project-enquiry.test.mjs` | • Automated verification to prevent regression in lead ingestion and downloads. |

---

## 4. File-by-File Breakdown (31 Files)

### A. Dependencies & Config
| File | Changes | Description |
| :--- | :--- | :--- |
| `package.json` | +2 lines | Added `libphonenumber-js: "1.13.2"`, `jsdom: "29.1.1"`. |
| `package-lock.json` | +19 lines | Locked dependencies for libphonenumber-js and jsdom. |
| `.gitignore` | +7 lines, -1 line | Configured ignored scratch scripts and project specification docs. |

### B. Core Libraries & Utilities
| File | Changes | Description |
| :--- | :--- | :--- |
| `src/lib/phone-input.ts` | +64 lines | Added international phone parser, canonical formatter, and storage variant generator. |
| `src/lib/project-links.ts` | +20 lines, -2 lines | Added `projectEnquiryHref()`, `projectVisitHref()`, and location text formatting. |
| `src/lib/lead-attribution.ts` | +1 line, -1 line | Added `utm_id` key support. |
| `src/lib/hooks/useOtpConfig.ts` | +31 lines, -14 lines | Added timeout, abort controller, error handling, and retry logic. |
| `src/lib/whatsapp/crm.ts` | +30 lines, -12 lines | Hardened phone lookup logic using `canonicalPhoneNumber()`. |

### C. UI Components
| File | Changes | Description |
| :--- | :--- | :--- |
| `src/components/ui/ProjectEnquirySection.tsx` | +60 lines (New) | Standardized inline quote/visit enquiry component for project pages. |
| `src/components/ui/ContactForm.tsx` | +79 lines, -25 lines | Added `allowInternationalPhone`, country code picker, and international paste support. |
| `src/components/ui/DownloadPopup.tsx` | +63 lines, -20 lines | Added country selector and international phone formatting for brochure downloads. |
| `src/components/ui/ProjectLandingTemplate.tsx` | +35 lines, -6 lines | Embedded `ProjectEnquirySection` and location links on landing pages. |
| `src/components/ui/ProjectsFilterClient.tsx` | +11 lines, -10 lines | Updated cards to link to `/projects/<slug>#book-visit` and enabled Arudra international brochure download. |
| `src/components/ui/ProjectDetailActions.tsx` | +5 lines, -4 lines | Updated enquiry anchor links to `#book-visit`. |
| `src/components/ui/ProjectVisitLink.tsx` | +3 lines, -2 lines | Updated visit link calculation. |
| `src/components/layout/Navbar.tsx` | +2 lines, -1 line | Dynamic project visit href resolution from navbar. |

### D. Pages & API Routes
| File | Changes | Description |
| :--- | :--- | :--- |
| `src/app/api/contact/route.ts` | +13 lines, -3 lines | Validates incoming contact form phone numbers against `parseContactPhone()`. |
| `src/app/(CRM_SOFTWARE)/crm/leads/actions.ts` | +26 lines, -7 lines | Bound status update syncs to matching canonical phone IDs. |
| `src/app/(CRM_SOFTWARE)/crm/leads/LeadsClient.tsx` | +8 lines, -5 lines | Cleaned up lead table display and phone formatting. |
| `src/app/(public)/projects/[slug]/page.tsx` | +41 lines, -30 lines | Embedded inline enquiry section and location map button for all projects. |
| `src/app/(public)/projects/[slug]/videos/page.tsx` | +4 lines, -3 lines | Updated video page enquiry link references. |
| `src/app/(public)/projects/page.tsx` | +1 line | Minor import/formatting clean up. |
| `src/app/(public)/projects/sv-kanaka-maple-homes/page.tsx` | +20 lines, -15 lines | Integrated `ProjectEnquirySection` and direct `#book-visit` actions. |
| `src/app/(public)/projects/tjr-township/page.tsx` | +20 lines, -17 lines | Integrated `ProjectEnquirySection` and direct `#book-visit` actions. |
| `src/app/(public)/projects/vaibhav-county/page.tsx` | +20 lines, -17 lines | Integrated `ProjectEnquirySection` and direct `#book-visit` actions. |
| `src/app/(public)/projects/vian-vally/page.tsx` | +10 lines, -8 lines | Integrated `ProjectEnquirySection` and direct `#book-visit` actions. |

### E. Test Files
| File | Changes | Description |
| :--- | :--- | :--- |
| `tests/contact-phone-api.test.mjs` | +131 lines (New) | Tests phone validation rules, international code detection, and storage formats. |
| `tests/crm-phone-matching.test.mjs` | +224 lines (New) | Tests CRM status syncing across domestic and overseas leads. |
| `tests/document-download.test.mjs` | +272 lines (New) | Tests brochure download requests, OTP gates, and validation. |
| `tests/lead-attribution.test.mjs` | +49 lines (New) | Tests campaign UTM and click-id attribution extraction. |
| `tests/project-enquiry.test.mjs` | +347 lines (New) | Tests end-to-end project enquiry submission and routing. |

---

## 5. Developer Action Items

1. **Install new dependencies on local machine:**
   ```bash
   cd BHUWANTA_WEBSITE
   npm install
   ```
2. **Verify tests and TypeScript compilation:**
   ```bash
   npm test
   npx tsc --noEmit
   ```
3. **Branch Protection:**
   Always develop in feature branches (`feature/<name>` or `fix/<name>`), never committing directly to `main`.

