---
name: clean-code
description: Code quality guardrails from the Robert C. Martin series (Clean Code, Clean Architecture, The Clean Coder). Use when building, reviewing, or refactoring production code.
paths:
  - "packages/api/app/**"
  - "packages/apps/src/**"
---

# Clean code guardrails

Distilled from the Robert C. Martin series — actionable rules, not a book summary.

**Priority:** Domain skills override when more specific ([api/layers.md](../api/layers.md), [apps-ui](../apps-ui/SKILL.md), OpenAPI parity, forbidden patterns in `api/SKILL.md`).

## Naming

- Reveal intent; avoid encodings and noise (`data`, `info`, `manager`).
- One word per abstraction level; be consistent across the codebase.

## Functions

- Small; do one thing; one level of abstraction per function.
- Few arguments (0–2 preferred); no hidden side effects.
- Prefer command/query separation where practical.

## Comments

- Explain **why**, not **what**.
- Delete commented-out code.
- Do not excuse bad code with comments — refactor instead.

## Error handling

- Prefer exceptions over error codes in application code.
- Wrap third-party boundaries; do not swallow errors silently.
- Avoid returning null when a safer alternative exists (empty collection, optional type).

## Classes and modules

- Single Responsibility Principle.
- Prefer composition over inheritance.
- Keep files focused; split when cohesion breaks down.

## Tests (F.I.R.S.T.)

- **Fast**, **Independent**, **Repeatable**, **Self-validating**, **Timely**.
- See [testing](../testing/SKILL.md) for project commands and layout.

## Architecture (summary)

- **Dependency rule:** source dependencies point inward; domain logic does not depend on UI, framework, or DB details.
- Details: [architecture.md](architecture.md).
- Laravel layering: defer to [api/layers.md](../api/layers.md).

## The Clean Coder

- **Boy Scout Rule:** leave code cleaner than you found it.
- Do not check in code that breaks build or existing tests.
- Do not shortcut past domain forbidden lists — ask the user instead.

## Review

Before handoff (especially multitask chunks), scan [smells.md](smells.md) on touched files.
