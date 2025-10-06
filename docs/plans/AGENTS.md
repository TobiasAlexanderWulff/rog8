# Docs/Plans Agent Guide

## Purpose
`docs/plans/` hosts implementation outlines and RFC-style briefs for substantial features. Draft plans here before touching core systems so the roadmap and code stay aligned.

## Workflow
- Start every major initiative with a scoped plan that captures goals, constraints, dependencies, and validation steps.
- Cross-link the relevant entries in `../ROADMAP.md` and affected docs so maintainers can trace decisions.
- Mark outstanding questions or risks explicitly and flag owners or follow-up tasks when known.

## Formatting & Hygiene
- Use Markdown with clear headings (`Summary`, `Risks`, `Open Questions`, `Next Steps`).
- Keep files ASCII, deterministic, and versioned; prefer appending dated sections over rewriting history.
- Reference the repository-wide standards in `../../AGENTS.md` and the documentation guidance in `../AGENTS.md` when updating conventions.

## Maintenance
Archive superseded plans by noting their status at the top of the document rather than deleting them. Update this guide if planning practices change.
