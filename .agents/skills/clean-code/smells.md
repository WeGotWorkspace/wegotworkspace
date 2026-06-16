# Code smells checklist

Use when reviewing diffs or before multitask chunk handoff. Not every item requires action — use judgment and domain skill constraints.

## Functions

- [ ] Too long (> ~20 lines worth of logic)
- [ ] More than 3 parameters
- [ ] Does more than one thing
- [ ] Mixes abstraction levels

## Names

- [ ] Unclear abbreviations
- [ ] Misleading names (does not match behavior)
- [ ] Magic numbers/strings without named constants

## Duplication

- [ ] Copy-pasted blocks (DRY violation)
- [ ] Long Tailwind strings in TSX or raw CSS properties where `@apply` belongs ([apps-ui](../apps-ui/SKILL.md))

## Coupling

- [ ] Feature envy (method uses another module's data more than its own)
- [ ] Shotgun surgery (one change forces many files)
- [ ] Inappropriate intimacy (reaching into another module's internals)

## Dead code

- [ ] Unused imports, variables, functions
- [ ] Commented-out blocks

## Error handling

- [ ] Empty catch blocks
- [ ] Generic catch without context
- [ ] Error paths untested

## Tests

- [ ] Behavior change without test update
- [ ] Tests that mirror implementation detail instead of contract

## Project-specific red flags

- [ ] Legacy PHP patterns in `packages/api` (see `api/SKILL.md` forbidden list)
- [ ] Inline `style={}` presets that should be CSS variables ([apps-ui](../apps-ui/SKILL.md))
- [ ] `window.location` or router calls inside workspace packages ([workspace](../workspace/SKILL.md))
