# CRM Leads Custom Export (PDF & Excel with Column Selection) Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Provide an interactive, branded export modal on the CRM Leads page (`/crm/leads`) allowing users to choose their download format (PDF Document, Excel Spreadsheet, or CSV) and select exactly which columns to include, rendered with the official Bhuwanta executive color theme matching the automated email report PDF.

**Architecture:**
- **UI Component (`ExportLeadsModal.tsx`)**: A lightweight, responsive modal triggered by the "Export" button on `/crm/leads`. Allows selecting export format (PDF, Excel, CSV), choosing lead scope (All filtered leads vs. Selected leads only), and customizing the column checklist with toggle controls (Select All / Reset to Recommended).
- **Client Exporter Utility (`leads-export.ts`)**: Pure client-side export generator leveraging `jspdf`, `jspdf-autotable`, and `xlsx` (already bundled in the project). Dynamically adjusts table column widths and text alignment based on active column selections, applying the official Bhuwanta executive theme: Deep Navy (`#002935` / `#1E3A5F`), Brand Gold (`#C4A55A`), alternating Slate-50 rows (`#F8FAFC`), and clean dividing borders (`#E2E8F0`).
- **TDD Test Suite (`tests/crm-leads-export.test.mjs`)**: Comprehensive unit tests validating dynamic column slicing, phone string preservation in Excel, PDF layout calculations, empty selection guards, and double-click mutex protection.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS v4, `jspdf`, `jspdf-autotable`, `xlsx`, `lucide-react`, `sonner`.

---

## Available Export Columns

| Column Key | Display Label | Default Active | Alignment | Optimal Min Width |
| :--- | :--- | :---: | :---: | :---: |
| `date` | Date & Time (IST) | Yes | Left | 85 pt |
| `name` | Customer Name | Yes | Left | 95 pt |
| `phone` | Phone Number | Yes | Left | 85 pt |
| `email` | Email Address | Yes | Left | 110 pt |
| `source` | Lead Source | Yes | Left | 80 pt |
| `project` | Project Name | Yes | Left | 80 pt |
| `status` | Lead Status | Yes | Center | 70 pt |
| `enquiry_type` | Enquiry Type | No | Left | 75 pt |
| `message` | Message / Notes | Yes | Left | 'auto' |
| `downloads` | Downloaded Item | No | Left | 70 pt |

---

## Bite-Sized Implementation Tasks

### Task 1: Create Client-Side Leads Export Utility

**Files:**
- Create: `BHUWANTA_WEBSITE/src/lib/reports/leads-export.ts`
- Test: `BHUWANTA_WEBSITE/tests/crm-leads-export.test.mjs`

**Step 1: Write the failing unit tests**
Define tests covering:
1. Column filtering: Ensures only selected column keys appear in the generated output.
2. Formatted date conversion: Converts ISO timestamps to IST (`Asia/Kolkata`) format.
3. Phone number preservation: Ensures phone numbers are exported without truncation or scientific notation.
4. PDF column style calculation: Auto-allocates proportional widths for jsPDF autoTable.
5. Excel worksheet generation: Sets proper worksheet column widths and string types.
6. CSV escaping: Properly wraps entries with commas or line breaks.

**Step 2: Run test to verify failure**
```bash
cd BHUWANTA_WEBSITE && node --test tests/crm-leads-export.test.mjs
```
Expected: FAIL (`Cannot find module '@/lib/reports/leads-export'`).

**Step 3: Implement `leads-export.ts`**
- Export column configuration dictionary with labels, default states, and formatting functions.
- `exportLeadsToPDF(leads, selectedColumns, options)`: Generates landscape A4 PDF with Bhuwanta header, autoTable data, and page numbers.
- `exportLeadsToExcel(leads, selectedColumns, filename)`: Creates workbook with `XLSX.utils.json_to_sheet`, applies column width metadata and initiates download.
- `exportLeadsToCSV(leads, selectedColumns, filename)`: RFC-4180 compliant CSV generator.

**Step 4: Run test to verify it passes**
```bash
cd BHUWANTA_WEBSITE && node --test tests/crm-leads-export.test.mjs
```
Expected: PASS (All test assertions pass).

**Step 5: Commit**
```bash
git add src/lib/reports/leads-export.ts tests/crm-leads-export.test.mjs
git commit -m "feat(crm): implement client-side leads export utility for PDF, Excel and CSV"
```

---

### Task 2: Create Reusable `ExportLeadsModal` Component

**Files:**
- Create: `BHUWANTA_WEBSITE/src/app/(CRM_SOFTWARE)/crm/leads/components/ExportLeadsModal.tsx`

**Step 1: Create Component Interface & State**
- Props:
  - `isOpen: boolean`
  - `onClose: () => void`
  - `leads: any[]` (all currently filtered leads)
  - `selectedLeadIds: string[]` (ids of checked leads, if any)
  - `totalCount: number`
  - `activeFiltersSummary?: string` (e.g. "Status: Contacted • Source: Meta")
- Local State:
  - `format: 'pdf' | 'excel' | 'csv'` (default: `'pdf'`)
  - `scope: 'filtered' | 'selected'` (default: `'selected'` if selectedLeadIds > 0, else `'filtered'`)
  - `selectedColumns: string[]` (pre-selected with default active columns)
  - `isExporting: boolean` + synchronous double-click lock (`useRef`)

**Step 2: Build Modal Header & Scope Selector**
- Header: Brand icon (`Download`), "Export CRM Leads", close `X` button.
- If user has checked rows in the table (`selectedLeadIds.length > 0`), display a scope radio pill:
  - `All Filtered Leads (${leads.length})`
  - `Only Selected Rows (${selectedLeadIds.length})`

**Step 3: Build Format Selector Cards**
- 3 visual card options with icons and descriptions:
  1. **PDF Document** (`FileText` icon, `#002935` active border, "Publication-grade formatted PDF")
  2. **Excel Spreadsheet** (`FileSpreadsheet` icon, Emerald border, "Microsoft Excel .xlsx workbook")
  3. **CSV File** (`FileCode` icon, Slate border, "Standard comma-separated values")

**Step 4: Build Column Checklist with Quick Selectors**
- Action row: "Choose Columns to Include" + Quick actions: `Select All` | `Reset to Recommended` | `Clear All`.
- Responsive 2-column or 3-column chip/checkbox grid.
- Selected column count counter (`e.g. 7 of 10 columns selected`).
- Warning banner if 0 columns selected (`"Please select at least one column to export"`).

**Step 5: Build Footer & Trigger Handler**
- "Cancel" button.
- "Export [PDF/Excel/CSV] ([N] Leads)" primary button styled with `#002935` / hover `#1e3a5f` with `Loader2` spinner.
- Calls `exportLeadsToPDF`, `exportLeadsToExcel`, or `exportLeadsToCSV`.
- Triggers success toast via `sonner`: `"Export complete! Downloaded N leads."`

---

### Task 3: Integrate Export Modal into `LeadsClient.tsx`

**Files:**
- Modify: `BHUWANTA_WEBSITE/src/app/(CRM_SOFTWARE)/crm/leads/LeadsClient.tsx`

**Step 1: Add State & Import Component**
- Import `ExportLeadsModal` from `./components/ExportLeadsModal`.
- Add `const [isExportModalOpen, setIsExportModalOpen] = useState(false)`.

**Step 2: Replace direct `exportToCSV` trigger**
- Update the "Export" button in the header (line 806):
  - Change button label from "Export CSV" to "Export".
  - Change `onClick={exportToCSV}` to `onClick={() => setIsExportModalOpen(true)}`.
  - Add download dropdown/modal icon indicator (`Download` + `ChevronDown`).

**Step 3: Mount `ExportLeadsModal`**
- Mount `<ExportLeadsModal ... />` before closing tag.
- Pass `leads={filteredLeads}`, `selectedLeadIds={selectedLeadIds}`, and `onClose={() => setIsExportModalOpen(false)}`.

**Step 4: Run Type Check & Test Suite**
```bash
cd BHUWANTA_WEBSITE && npx tsc --noEmit && npm test
```
Expected: 0 TypeScript errors, all tests pass.

**Step 5: Commit**
```bash
git add src/app/(CRM_SOFTWARE)/crm/leads/LeadsClient.tsx src/app/(CRM_SOFTWARE)/crm/leads/components/ExportLeadsModal.tsx
git commit -m "feat(crm): integrate custom format & column export modal into Leads CRM page"
```

---

### Task 4: Full Verification & Mobile Testing

**Files:**
- Test: `BHUWANTA_WEBSITE/tests/crm-leads-export.test.mjs`
- Test: `BHUWANTA_WEBSITE/tests/crm-ui-edge-cases.test.mjs`

**Step 1: Run comprehensive tests**
- Verify 100% passing across all test suites (`npm test`).
- Verify strict TypeScript types (`npx tsc --noEmit`).

**Step 2: Manual / Responsive Verification**
- Verify modal on small screens (max height `90vh`, touch-friendly checkbox chips, no horizontal scroll leak).
- Verify PDF generation matches the executive email report (`#1E3A5F` header, alternating rows, page footers).
- Verify Excel download preserves phone strings cleanly.

**Step 3: Review Git Diff & Status**
```bash
git status && git diff --stat
```

