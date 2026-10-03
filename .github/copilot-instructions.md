# GitHub Copilot Instructions - Bhuwanta Repository

## Branch Protection & Development Rules
- **No Direct Commits to `main`**: Never suggest or execute direct commits to `main` or `master`.
- **Branch Naming**: All work must be conducted on branches with prefixes like `feature/`, `hotfix/`, `fix/`, `refactor/`, or `test/`.
- **Quality Gates**: Ensure code passes `npm test` and `npx tsc --noEmit`.
- Refer to `AGENTS.md` for complete repository conventions and architecture.
