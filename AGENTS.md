# 🤖 BHUWANTA REPOSITORY AI AGENT RULES BOOK & GOVERNANCE

> **MANDATORY REPOSITORY DIRECTIVE**:
> All AI coding assistants (**Claude Code**, **Google Gemini / Antigravity**, **Cursor**, **OpenAI Codex / ChatGPT**, **Windsurf**, **GitHub Copilot**, **Devin**, etc.) and human developers **MUST** read, respect, and strictly enforce this rules book before performing any work in this repository.

---

## 🚫 1. THE GOLDEN RULE: NEVER CODE DIRECTLY ON `main`

### 🔑 The Core Distinction:
| Action | Allowed on `main`? | Notes |
| :--- | :---: | :--- |
| **Writing / Editing Code** | ❌ **STRICTLY FORBIDDEN** | All coding, file edits, and refactoring MUST happen on a dedicated branch. |
| **Direct Commits of Code Changes** | ❌ **STRICTLY FORBIDDEN** | Blocked automatically by git pre-commit hook. |
| **Merging Tested Feature Branches** | ✅ **ALLOWED** | Merging via `git merge <branch>` after `npm test` & typecheck pass is allowed. |
| **Pushing `main` to Remote** | ✅ **ALLOWED** | Pushing `git push origin main` after merging is allowed. |

### ⛔ Zero Tolerance on Direct Code Editing on `main`
1. **`main` is a production-grade branch.**
2. **NO AI agent or developer is permitted to write code, modify files, or commit new changes directly while on `main` or `master`.**
3. If an agent receives a prompt and finds itself on `main`, the **MANDATORY FIRST STEP BEFORE TOUCHING ANY FILE** is to create and switch to a separate branch:
   ```bash
   git checkout -b <branch-type>/<branch-name>
   ```
4. If an agent accidentally makes edits while on `main`, it **MUST NOT COMMIT**. It must immediately move the changes to a new branch:
   ```bash
   git checkout -b <branch-type>/<branch-name>
   ```

---

## 🌿 2. MANDATORY GIT BRANCHING WORKFLOW

Every agent working on any issue, feature, optimization, or bugfix must execute this exact sequence:

### Step 1: Check Current Branch & Working Tree
```bash
git branch --show-current
git status
```

### Step 2: Ensure Local `main` is Synchronized (if starting new work)
```bash
git checkout main
git pull origin main
```

### Step 3: Create and Switch to a Dedicated Branch
Always branch off up-to-date `main` using standardized prefix naming:
```bash
git checkout -b <prefix>/<short-descriptive-name>
```

#### Standard Branch Naming Prefixes:
| Prefix | Use Case | Example |
| :--- | :--- | :--- |
| `feature/` | New pages, modules, CRM capabilities, UI features | `feature/otp-toggle`, `feature/lead-export` |
| `hotfix/` | Urgent production fixes, mobile alignment, layout breaks | `hotfix/mobile-navbar-cutoff` |
| `fix/` | General bugs, API edge cases, validation issues | `fix/download-zero-input-bypass` |
| `refactor/` | Code reorganization, performance tuning (no behavior changes) | `refactor/redis-client-singleton` |
| `test/` | Adding or updating unit/integration test suites | `test/mobile-optimization-suite` |

---

## 🧪 3. MANDATORY QUALITY GATES (BEFORE MERGING)

Before any branch can be merged into `main` or pushed to remote, the agent **MUST** run:

```bash
# 1. Run full unit and regression test suites
npm test

# 2. Strict TypeScript type check (zero errors allowed)
npx tsc --noEmit
```

- ❌ **NEVER** merge into `main` if `npm test` fails.
- ❌ **NEVER** merge into `main` if `npx tsc --noEmit` reports errors.
- ❌ **NEVER** use `--no-verify` or force-push flags to bypass verification.

---

## 🔀 4. MERGING TO `main` & PUSHING (ALLOWED)

Once all coding and testing are complete on the dedicated branch, merging into `main` and pushing to remote is standard and expected:

### Standard Merge & Push Sequence:
```bash
# 1. Switch to main
git checkout main

# 2. Merge the tested feature/hotfix branch
git merge <branch-name> --no-ff -m "Merge branch '<branch-name>' into main"

# 3. Final smoke check
npm test

# 4. Push to remote
git push origin main
```

---

## 🛡️ 5. HARD TECHNICAL ENFORCEMENT (GIT PRE-COMMIT HOOK)

To guarantee that no agent or developer can bypass this rule—even accidentally—this repository provides an automated Git Pre-Commit Hook in `.githooks/pre-commit`.

### How the Hook Works:
1. Whenever `git commit` is invoked, the hook checks `git symbolic-ref --short HEAD`.
2. **If on `main` or `master`**:
   - If a **merge operation** is in progress (`MERGE_HEAD`), the commit is **ALLOWED** (integration of a tested branch).
   - If an agent is attempting a **direct code commit**, the commit is **PHYSICALLY BLOCKED** with exit code 1.

### One-Time Activation:
The hook is automatically enabled upon running `npm install` (via the `prepare` script in `package.json`).
You can also manually activate it at any time with:
```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```

---

## 📁 6. MULTI-AGENT COMPATIBILITY MATRIX

This repository maintains configuration files tailored for each AI agent ecosystem:

| Agent / Tool | Config File Read by Agent | Purpose |
| :--- | :--- | :--- |
| **All Agents & CLI** | [`AGENTS.md`](./AGENTS.md) | Universal root rules book & architectural guidelines |
| **Claude / Claude Code** | [`CLAUDE.md`](./CLAUDE.md) | Loaded into Claude system prompt automatically |
| **Google Gemini / Antigravity**| [`GEMINI.md`](./GEMINI.md) | Ingested by Gemini developer workflows & Antigravity |
| **Cursor AI** | [`.cursorrules`](./.cursorrules) & `.cursor/rules/` | Injected into Cursor AI composer & agent turns |
| **GitHub Copilot** | [`.github/copilot-instructions.md`](./.github/copilot-instructions.md) | Guides Copilot Chat, completions, and PR agents |
| **Git Engine (Hard Gate)** | [`.githooks/pre-commit`](./.githooks/pre-commit) | Blocks direct `git commit` on `main` at OS/CLI level |

---

## 🏗️ 7. ARCHITECTURE & CODE INTEGRITY RULES

1. **Clean Code & No Placeholders**:
   - Never commit `TODO` stubs, broken mocks, or dummy placeholders into production paths.
   - Real APIs must be used (Sanity CMS, Supabase, Upstash Redis, Resend).

2. **Preserve Documentation**:
   - Maintain existing docstrings, JSDoc annotations, and architectural comments.

3. **Public Site vs CRM Isolation**:
   - Public pages: `src/app/(public)/`
   - CRM Admin: `src/app/(dashboard)/crm/`
   - Real Estate software: `src/app/(REALESTATE_SOFTWARE)/REALESTATE_SOFTWARE/`
   - Never expose internal CRM API routes or tokens to public downloaders.

4. **Security & Secrets**:
   - Never commit `.env` or `.env.local`.
   - Never hardcode service role keys or tokens in client components (`"use client"`).

---

## 🗄️ 8. DIRECT DATABASE DDL & MIGRATION DIRECTIVE (ZERO MANUAL USER SQL)

> **MANDATORY POLICY**:
> AI coding assistants have **direct, full database management and DDL execution authority**.
> **NEVER ask the user to manually run SQL scripts in the Supabase Dashboard SQL Editor.** The agent must perform all database operations directly and autonomously.

### 🔑 Authentication & Capabilities:
- The workspace environment provides a **Permanent Supabase Personal Access Token** in `BHUWANTA_WEBSITE/.env.local`:
  ```bash
  SUPABASE_ACCESS_TOKEN="sbp_..."
  ```
- This token has full permission to execute PostgreSQL DDL (`CREATE TABLE`, `ALTER TABLE`, `DROP TABLE`, `CREATE POLICY`, `CREATE INDEX`, triggers, extensions, etc.) directly on the remote production Supabase instance.

### 🛠️ How AI Agents Must Execute DDL & Migrations:
Whenever database schema changes are required:
1. **Record the Migration File**:
   Always create or update the versioned SQL file in `BHUWANTA_WEBSITE/supabase/migrations/<timestamp>_<feature_name>.sql`.
2. **Execute the Migration Programmatically**:
   Execute the SQL directly against the **Supabase Management API** using a runner script or command:
   ```bash
   POST https://api.supabase.com/v1/projects/<project-ref>/database/query
   Headers:
     Authorization: Bearer ${SUPABASE_ACCESS_TOKEN}
     Content-Type: application/json
   Body:
     { "query": "<SQL statements>" }
   ```
   *(Project ref: `byroxiesodeyxxsalgsf` from `NEXT_PUBLIC_SUPABASE_URL`)*.
3. **Verify PostgREST Schema Cache & CRUD**:
   Query the table immediately via `@supabase/supabase-js` with `SUPABASE_SERVICE_ROLE_KEY` to verify that PostgREST schema cache has refreshed.
4. **Sync Dual-Store Caches**:
   If Upstash Redis maintains related caches, sync the data immediately.

---

## 📋 AGENT PRE-FLIGHT CHECKLIST (RUN BEFORE EVERY TURN)

```
[ ] 1. Checked current branch? (MUST NOT BE 'main' for coding)
[ ] 2. All code written on a dedicated feature/hotfix branch?
[ ] 3. Ran `npm test` and all unit tests passed?
[ ] 4. Ran `npx tsc --noEmit` and zero type errors?
[ ] 5. Database migrations executed directly via SUPABASE_ACCESS_TOKEN (no manual user SQL)?
[ ] 6. Switched to main, merged the branch, and ran final tests before pushing?
```
