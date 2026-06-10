# Pull requests

Only open a PR when the user explicitly asks (e.g. "open a PR", "create a pull request").

## Before push

When touching `packages/apps` or `packages/api`, run locally if feasible:

```bash
pnpm run ci:quality
```

For API contract work also run `pnpm test:api-done-gate` — see [testing](../testing/SKILL.md).

Ensure commits are **signed** (required for merge to `main`).

## Push branch

```bash
git push -u origin HEAD
```

## Create PR (GitHub CLI)

```bash
gh pr create --title "type(scope): short description" --body "$(cat <<'EOF'
## Summary
…

## Test plan
- [ ] …

EOF
)"
```

Use the repo template sections where applicable — see [`.github/pull_request_template.md`](../../../.github/pull_request_template.md):

- **Summary** — what and why ([document](../document/SKILL.md) feature summary template)
- **Type of change** — check one box
- **How to test** — concrete steps ([testing](../testing/SKILL.md) commands)
- **Checklist** — local test, docs, tests updated
- **API changes** — only if `packages/api` touched (OpenAPI, `pnpm check:api-types`, feature tests)
- **Notes for reviewers** — trade-offs, follow-ups

PR title: same Conventional Commits style as commit subject when possible.

## Required CI (branch protection on `main`)

From root [README.md](../../../README.md):

- `build` (CI)
- `SAST (CodeQL JS/TS)`
- `SAST (Semgrep PHP)`
- `Secrets (Gitleaks)`
- `SCA (Trivy)`

Fix failing checks before expecting merge.

## Agent rules

- **Do not** push or open PRs unless the user asks.
- **Do not** force-push `main`.
- **Do not** skip hooks (`--no-verify`) unless the user explicitly requests it.
- **Do not** amend commits unless user requests it and amend rules are satisfied (unpushed, your commit, etc.).
- Use `gh` for all GitHub tasks (PR, checks, issues).

## After PR

User may ask to address review comments or CI failures — fix on the same branch, push, re-run checks.
