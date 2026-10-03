# CLAUDE.md - Rules for Claude Code in Bhuwanta Repository

## ⛔ CRITICAL RULE: NEVER WORK OR COMMIT ON `main`

As an AI assistant working on this repository, you **MUST NEVER** make file modifications or run `git commit` directly on the `main` or `master` branch.

### Mandatory Workflow for Claude:
1. **On every new task**, immediately check the current branch:
   ```bash
   git branch --show-current
   ```
2. **If on `main`**, create and switch to a descriptive branch BEFORE touching any files:
   ```bash
   git checkout -b feature/<name>   # For new features, modules, pages
   git checkout -b hotfix/<name>    # For urgent layout/mobile bugfixes
   git checkout -b fix/<name>       # For general bugfixes
   ```
3. **Commit hygiene**: Only commit changes on your dedicated branch. Never force-push or bypass branch checks.

## Quality Gates Before Completing Tasks
Always verify all tests and TypeScript compiler checks pass before completing work:
```bash
npm test
npx tsc --noEmit
```

## Architectural Guidelines
- **Framework**: Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4, Vanilla CSS tokens.
- **Backend / Data**: Supabase (Database), Upstash Redis (Cache / Rate Limiting / Module Toggles), Sanity (CMS), Resend (Email).
- **Public vs CRM Separation**:
  - Public pages: `src/app/(public)/`
  - CRM pages: `src/app/(dashboard)/crm/`
  - Software: `src/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/`
- Always preserve existing comments and documentation.
- Do not create empty placeholders or mocks in production code paths.
- For complete operational rules, see [AGENTS.md](./AGENTS.md).
