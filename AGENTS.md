# 🤖 BHUWANTA REPOSITORY AI AGENT RULES BOOK & GOVERNANCE

> **MANDATORY REPOSITORY DIRECTIVE**:
> All AI coding assistants (**Claude Code**, **Google Gemini / Antigravity**, **Cursor**, **OpenAI Codex / ChatGPT**, **Windsurf**, **GitHub Copilot**, **Devin**, etc.) and human developers **MUST** read, respect, and strictly enforce this rules book before making any changes in this repository.

---

## 🚫 1. THE GOLDEN RULE: NEVER WORK OR COMMIT DIRECTLY ON `main`

### ⛔ Zero Tolerance on Direct `main` Modifications
1. **`main` is a strictly protected production branch.**
2. **NO AI agent is ever permitted to edit code or execute `git commit` directly while on `main` or `master`.**
3. If an agent receives a prompt and finds itself on `main`, the **MANDATORY FIRST STEP BEFORE TOUCHING ANY FILE** is to create and switch to a separate branch.
4. If an agent accidentally makes edits while on `main`, it **MUST NOT COMMIT**. It must immediately stash or move the edits to a new branch:
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

## 🛡️ 3. HARD TECHNICAL ENFORCEMENT (GIT PRE-COMMIT HOOK)

To guarantee that no agent or developer can bypass this rule—even accidentally—this repository provides an automated Git Pre-Commit Hook in `.githooks/pre-commit`.

### How the Hook Works:
Whenever `git commit` is invoked, the hook checks `git symbolic-ref --short HEAD`.
If the branch is `main` or `master`, the commit is **immediately aborted with exit code 1**.

### One-Time Activation:
The hook is automatically enabled upon running `npm install` (via the `prepare` script in `package.json`).
You can also manually activate it at any time with:
```bash
git config core.hooksPath .githooks
chmod +x .githooks/pre-commit
```

---

## 🧪 4. MANDATORY QUALITY GATES (BEFORE MERGING)

Before any branch can be considered complete, merged into `main`, or handed off to the user, the agent **MUST** verify all automated quality gates:

```bash
# 1. Run full unit and regression test suites
npm test

# 2. Strict TypeScript type check (zero errors allowed)
npx tsc --noEmit
```

- ❌ **NEVER** propose merging if `npm test` fails.
- ❌ **NEVER** ignore TypeScript compiler errors.
- ❌ **NEVER** use `--force` or `--no-verify` to bypass git hooks or quality gates.

---

## 🔄 5. MERGE PROTOCOL TO `main`

Only merge a branch into `main` after:
1. All changes are committed to the feature/hotfix branch.
2. `npm test` passes 100%.
3. `npx tsc --noEmit` returns 0 errors.
4. The user has reviewed, requested, or approved the merge.

### Standard Merge Command:
```bash
git checkout main
git merge <branch-name> --no-ff -m "Merge branch '<branch-name>' into main"
npm test
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

## 📋 AGENT PRE-FLIGHT CHECKLIST (RUN BEFORE EVERY TURN)

```
[ ] 1. Ran `git branch --show-current`? (MUST NOT BE 'main')
[ ] 2. Created a dedicated feature/hotfix branch?
[ ] 3. Ran `npm test` and all tests passed?
[ ] 4. Ran `npx tsc --noEmit` and zero type errors?
[ ] 5. Verified git status contains only intended changes?
```
