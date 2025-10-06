# Src/Shared Agent Guide

## Scope
`src/shared/` collects cross-cutting utilities, typed contracts, constants, and seeded services used by multiple domains.

## Expectations
- Keep modules generic; domain-specific logic should live in its home directory.
- Provide strict typings and documentation comments where helpers are broadly consumed.
- When changing shared APIs, coordinate updates across dependents and note the ripple plan in `docs/ROADMAP.md` if substantial.

## Hygiene
- Mirror specs under `src/shared/__tests__/` with deterministic fixtures.
- Avoid circular dependencies; prefer dependency injection into domain modules.
- Reference repository-wide standards in `../AGENTS.md` when updating conventions here.
