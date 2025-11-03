# Workflow Expectations

- Store CI definitions here; keep filenames descriptive (`ci.yml`, `deploy.yml`, etc.).
- When adding jobs, reuse the pinned Node and pnpm versions defined in `ci.yml` unless a workflow has a documented exception.
- Use Corepack (`corepack enable` + `corepack prepare pnpm@10.19.0 --activate`) to ensure pnpm is activated before invoking project scripts.
- Run only the necessary project scripts (`pnpm lint`, `pnpm typecheck`, `pnpm test`) so automation stays fast and deterministic.
- Review workflow changes alongside this guidance to confirm the steps remain aligned with the root `AGENTS.md`.
