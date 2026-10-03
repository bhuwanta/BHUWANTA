# GEMINI.md - Rules for Gemini & Antigravity in Bhuwanta Repository

## ⛔ CRITICAL RULE: NEVER CODE DIRECTLY ON `main`

1. **`main` is a strictly protected branch.**
2. **Never edit files or execute direct code commits on `main`.**
3. **Mandatory Step Before Coding**: Always create and switch to a dedicated branch off `main`:
   - `git checkout -b feature/<descriptive-name>`
   - `git checkout -b hotfix/<descriptive-name>`
   - `git checkout -b fix/<descriptive-name>`
4. **Merging & Pushing**: Once your branch passes `npm test` and `npx tsc --noEmit`, you may switch to `main`, merge your branch (`git merge <branch>`), and push to remote (`git push origin main`).

Refer to [AGENTS.md](./AGENTS.md) for full governance details.
