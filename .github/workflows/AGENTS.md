# Workflow Expectations

- Store CI definitions here; keep filenames descriptive (`ci.yml`, `deploy.yml`, etc.).
- When adding jobs, reuse the pinned Node and pnpm versions defined in `ci.yml` unless a workflow has a documented exception.
- Rely on `pnpm/action-setup@v4` with `standalone: true`, and keep the verification/fallback step so pnpm is guaranteed on the PATH.
- Run only the necessary project scripts (`pnpm lint`, `pnpm typecheck`, `pnpm test`) so automation stays fast and deterministic.
- Review workflow changes alongside this guidance to confirm the steps remain aligned with the root `AGENTS.md`.
