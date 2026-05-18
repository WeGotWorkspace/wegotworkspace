## Summary

<!-- What does this PR do? -->

## API greenfield (check all that apply)

- [ ] This PR does **not** touch `packages/api` REST / Laravel API
- [ ] Or: follows `packages/api/docs/greenfield-plan.md` and `.cursor/rules/api-greenfield.mdc`
- [ ] No delegation to legacy `MailApi`, `*Kernel`, `ApiKernel`, or `DomainRouteService`
- [ ] `composer --working-dir packages/api greenfield:guard` passes (or N/A — no `app/` yet)
- [ ] Feature tests added/updated for changed API routes
- [ ] OpenAPI / `pnpm check:api-types` unchanged unless intentionally updated

## Test plan

- [ ] `composer --working-dir packages/api test`
- [ ] `pnpm check:api-types` (if API types affected)
