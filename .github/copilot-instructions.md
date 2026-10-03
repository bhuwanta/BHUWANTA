# GitHub Copilot Instructions - Bhuwanta Repository

## Branch Protection & Development Rules
- **No Direct Coding on `main`**: Never write or suggest direct code edits on `main` or `master`. All coding must happen on dedicated branches (`feature/*`, `hotfix/*`, `fix/*`).
- **Merging & Pushing Allowed**: Merging a completed, tested branch into `main` and pushing to remote is allowed.
- **Quality Gates**: Ensure code passes `npm test` and `npx tsc --noEmit`.
- Refer to `AGENTS.md` for complete repository conventions and architecture.
