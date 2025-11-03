# GitHub Automation Guidance

- Follow root `AGENTS.md` for repository-wide standards, especially build commands and tool versions.
- Keep workflow action versions pinned (`actions/checkout@v4`, `actions/setup-node@v4`, etc.) to ensure deterministic CI runs.
- Align Node and pnpm versions with the root guidance (`node@20.18.0`, `pnpm@10.19.0`) when updating workflows.
- Use Corepack to activate pnpm (`corepack enable` + `corepack prepare pnpm@10.19.0 --activate`) so the pinned CLI is always available on runners.
- Prefer built-in caching (e.g., `actions/setup-node` with `cache: pnpm`) instead of bespoke cache scripts unless a workflow needs additional artifacts.
- Document any new automation behaviour in this file and in `docs/ROADMAP.md` if it impacts development flow.
