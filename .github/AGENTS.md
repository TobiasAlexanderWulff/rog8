# GitHub Automation Guidance

- Follow root `AGENTS.md` for repository-wide standards, especially build commands and tool versions.
- Keep workflow action versions pinned (`actions/checkout@v4`, `actions/setup-node@v4`, etc.) to ensure deterministic CI runs.
- Align Node and pnpm versions with the root guidance (`node@20.18.0`, `pnpm@10.19.0`) when updating workflows.
- Use Corepack to activate pnpm (`corepack enable` + `corepack prepare pnpm@10.19.0 --activate`), append `$HOME/.local/share/pnpm` to `GITHUB_PATH`, and cache the pnpm store via `actions/cache@v4` keyed by `pnpm-lock.yaml`.
- Reuse the shared `actions/cache@v4` pattern from `ci.yml` for pnpm store caching unless a workflow needs additional artifacts.
- Document any new automation behaviour in this file and in `docs/ROADMAP.md` if it impacts development flow.
