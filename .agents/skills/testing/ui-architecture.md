# UI test architecture (Vitest)

## Layout

- Co-locate tests: `*.test.ts` / `*.test.tsx` next to source (see `meet-core`, `lib/rtc`, `lib/api/wgw`).
- Run: `pnpm test` or `pnpm test:watch` in `packages/apps`.
- Config: `packages/apps/vitest.config.ts`.

## What to test with Vitest

| Good fit | Examples |
|----------|----------|
| Pure functions | `meet-room-id.test.ts`, `auth-token.test.ts` |
| Session / protocol logic | `peer-mesh.test.ts`, `meet-control-messages.test.ts` |
| Hooks (with RTL) | `use-meet-inbound-media-hints.test.tsx` |
| Config / env parsing | `config.test.ts`, `force-relay.test.ts` |

## What belongs in Storybook instead

| Storybook | Vitest |
|-----------|--------|
| Visual states, layout, responsive breakpoints | Business logic, parsing, state machines |
| CSS variable theming across variants | API client behavior |
| Empty / loading / error **appearance** | Error **handling** contracts |

See [storybook/coverage.md](../storybook/coverage.md).

## Practices

- Prefer testing public module exports over private helpers.
- Mock HTTP at `lib/api/wgw` boundaries; use fixtures for stable shapes.
- Avoid snapshot tests unless output is stable and high-value.
- Keep tests fast (F.I.R.S.T. — see [clean-code](../clean-code/SKILL.md)).

## Accessibility

Automated a11y in Storybook via addon — see [storybook/a11y-testing.md](../storybook/a11y-testing.md) and [accessibility](../accessibility/SKILL.md).

## API tests

PHPUnit feature tests and done gate: [api/testing.md](../api/testing.md).
