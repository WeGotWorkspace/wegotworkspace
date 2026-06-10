# Done checklist

Run before declaring work complete or opening a PR (when the user asks). Policy context: [.agents/POLICY.md](../../POLICY.md).

## Always (any touched package)

- [ ] Changes match the relevant domain skill (`api`, `apps-ui`, `workspace`, `meet`, …)
- [ ] No unrelated refactors or markdown the user did not ask for
- [ ] [clean-code/smells.md](../clean-code/smells.md) scan on touched files
- [ ] `git status` clean for intended scope (no accidental `.env`, secrets, debug logs)

## API (`packages/api`)

```bash
cd packages/api && composer test -- --filter <Domain>   # domain you changed
pnpm test:api-done-gate                                 # from repo root, before merge-ready API work
```

- [ ] OpenAPI updated if HTTP contract changed (`packages/api/openapi/openapi.json`)
- [ ] Feature tests assert status + JSON shape ([testing/test-first.md](../testing/test-first.md))
- [ ] `composer greenfield:guard` passes
- [ ] Typegen if contract changed: `pnpm --filter @wgw/api run openapi:build-json` + apps typegen

Optional local: `pnpm test:api-e2e:docker`, `pnpm test:meet-api` (meet signaling).

## UI (`packages/apps`)

```bash
pnpm --dir packages/apps test              # Vitest
pnpm dev:ui                              # Storybook — mock-tier stories for changed exports
```

- [ ] New/changed **exports** have **mock-tier** stories ([storybook/offline-first.md](../storybook/offline-first.md))
- [ ] Stories run without Docker/API (`pnpm dev:ui` only)
- [ ] Slice handlers / mock `operations` — no `@/lib/api/wgw/http` in panes ([apps-ui/components.md](../apps-ui/components.md))
- [ ] Storybook a11y panel on new/changed stories ([storybook/a11y-testing.md](../storybook/a11y-testing.md))
- [ ] Vitest for new/changed hooks, parsers, RTC/session logic ([testing/ui-architecture.md](../testing/ui-architecture.md))

Meet/RTC: `pnpm --dir packages/apps exec vitest run src/lib/rtc/session src/meet-core/src/meet-rtc-session.test.ts`

## Full-stack feature

- [ ] API checklist + UI checklist
- [ ] OpenAPI/typegen before UI consumers if contract changed
- [ ] After parallel agent chunks: parent runs full verify ([multitask.md](multitask.md))

## Before PR (when user requests push/PR)

```bash
pnpm run ci:quality
```

- [ ] Signed commits ([git-workflow/pull-requests.md](../git-workflow/pull-requests.md))
- [ ] PR test plan lists concrete commands run ([testing/SKILL.md](../testing/SKILL.md))

## Dev environment issues

If verification commands fail unexpectedly, see [dev-environment/SKILL.md](../dev-environment/SKILL.md).
