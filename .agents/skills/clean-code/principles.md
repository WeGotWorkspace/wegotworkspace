# Clean code principles (optional)

Generic notes from the Robert C. Martin series. **Primary workflow:** [smells.md](smells.md). Domain skills override these when more specific.

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

## The Clean Coder

- **Boy Scout Rule:** leave code cleaner than you found it.
- Do not check in code that breaks build or existing tests.
- Do not shortcut past domain forbidden lists — ask the user instead.
