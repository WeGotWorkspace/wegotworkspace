## Summary

<!-- What does this PR do? -->

## API greenfield (check all that apply)

- [ ] This PR does **not** touch `packages/api` REST / Laravel API
- [ ] Or: follows `packages/api/docs/greenfield-plan.md` and `.cursor/rules/api-greenfield.mdc`
- [ ] Does **not** restore `packages/api/src/` or legacy `*Kernel` / `MailApi`
- [ ] Feature tests added/updated for changed API routes (when runtime exists)
- [ ] OpenAPI / `pnpm check:api-types` unchanged unless intentionally updated

## Test plan

- [ ] `pnpm check:api-types` (if OpenAPI or generated types changed)
- [ ] `composer --working-dir packages/api test` (after Laravel scaffold exists)
