# GEMINI.md - Rules for Gemini & Antigravity in Bhuwanta Repository

## ⛔ CRITICAL RULE: NEVER WORK OR COMMIT ON `main`

1. **`main` is a strictly protected production branch.**
2. **Never edit files or execute `git commit` on `main`.**
3. **Mandatory Step Before Coding**: Always create and switch to a dedicated branch off `main`:
   - `git checkout -b feature/<descriptive-name>`
   - `git checkout -b hotfix/<descriptive-name>`
   - `git checkout -b fix/<descriptive-name>`

## Quality Gates
Before proposing a merge or declaring a task complete:
- Run `npm test` (all unit & integration tests must pass).
- Run `npx tsc --noEmit` (0 TypeScript errors allowed).

Refer to [AGENTS.md](./AGENTS.md) for full governance details.
