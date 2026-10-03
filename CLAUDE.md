# CLAUDE.md - Rules for Claude Code in Bhuwanta Repository

## ⛔ CRITICAL RULE: NEVER CODE DIRECTLY ON `main`

As an AI assistant working on this repository:
- **Coding on `main` is STRICTLY FORBIDDEN**: Never write, edit, or commit new code directly on `main` or `master`.
- **Merging & Pushing IS ALLOWED**: Once you have developed, tested, and verified changes on a dedicated branch, merging the branch into `main` and pushing `main` to remote is allowed.

### Mandatory Workflow for Claude:
1. **On every new task**, immediately check the current branch:
   ```bash
   git branch --show-current
   ```
2. **If on `main`**, create and switch to a descriptive branch BEFORE editing any files:
   ```bash
   git checkout -b feature/<name>   # For new features, modules, pages
   git checkout -b hotfix/<name>    # For urgent layout/mobile bugfixes
   git checkout -b fix/<name>       # For general bugfixes
   ```
3. **Write and verify code on your branch**:
   ```bash
   npm test
   npx tsc --noEmit
   git commit -m "feat: descriptive commit message"
   ```
4. **Merge to `main` and Push (when ready/instructed)**:
   ```bash
   git checkout main
   git merge <your-branch-name> --no-ff -m "Merge branch '<your-branch-name>' into main"
   npm test
   git push origin main
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
