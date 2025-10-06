# Docs Agent Guide

## Scope
This directory stores enduring reference material for the project, including the concept brief, roadmap, and tech stack. Treat everything here as source-of-truth documentation that should stay in sync with the implementation.

## Expectations
- Align every addition or update with the repository standards in `../AGENTS.md`.
- Keep docs concise, dated when context shifts, and link out to relevant plans in `docs/plans/`.
- When procedures, architecture, or gameplay beats change, update the appropriate brief immediately and note follow-up tasks in `docs/ROADMAP.md` if work remains.

## Hygiene
- Prefer Markdown with repository-relative links and ASCII formatting.
- Before large doc reorganizations, outline the proposal in `docs/plans/` and flag downstream files that need updates.
- Verify that any auxiliary assets referenced here live under `src/assets/` or another tracked location specified in the root guidance.

## Escalation
If documentation expectations expand beyond this directory, sync with maintainers and propagate matching guidance to each affected `AGENTS.md`.
