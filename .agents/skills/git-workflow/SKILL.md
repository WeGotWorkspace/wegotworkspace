---
name: git-workflow
description: Git workflow for this repository — branching, commits, pull requests, signed commits, and CI gates. Use when creating branches, staging, committing, opening PRs, or asked about git workflow.
---

# Git workflow

## Quick decision matrix

| Task | Read |
|------|------|
| Creating or naming a branch | [branches.md](branches.md) |
| Staging / committing | This file (below) |
| Opening or updating a PR | [pull-requests.md](pull-requests.md) |
| PR summary wording | [document](../document/SKILL.md) |
| Test plan for PR | [testing](../testing/SKILL.md) |
| Parallel agent branches | [developer/multitask.md](../developer/multitask.md) |

## Commits

- **Do not** run `git commit` or create commits on your own initiative, including after finishing a task or refactor.
- **Only** stage and commit when the user clearly requests a commit (e.g. "commit", "commit this", "commit the diff").
- It is fine to run read-only git commands (`git status`, `git diff`, `git log`) for investigation without asking.
- **Do not** push to remote unless the user explicitly asks.

## Signed commits (required)

Branch protection on `main` requires **cryptographically signed commits** (GPG or SSH). A Husky **post-commit** hook checks `git log -1 --format=%G?` on `HEAD` and **rejects unsigned commits** (soft-reset, changes stay staged).

**Before committing** (when the user asks), verify signing is configured:

```bash
git config --get commit.gpgSign    # should be true
git config --get user.signingkey   # must be set (SSH .pub path or GPG key id)
git config --get gpg.format        # ssh or gpg (default openpgp)
```

If `commit.gpgSign` is not `true`, **always** pass `-S` / `--gpg-sign`:

```bash
git commit -S -m "$(cat <<'EOF'
type(scope): subject

EOF
)"
```

**Agent rules:**

1. Check signing config before the first commit on a branch; configure locally if missing (SSH example in [README.md](../../../README.md) release signing table).
2. Never push unsigned commits to branches that target `main`.
3. If the signed-commit hook fails, **fix signing config and recommit** — do **not** use `--no-verify` or `HUSKY=0` unless the user explicitly requests it.
4. CI branch protection also rejects unsigned commits on merge; hooks catch the problem at commit time.

## Conventional Commits (when the user asks you to commit)

Use **[Conventional Commits](https://www.conventionalcommits.org/)** for every commit message:

- **Format:** `<type>(<optional scope>): <description>`
  Example: `feat(settings): add mail transport label helper`
- **Common types:** `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`
- **Description:** imperative mood, lowercase start (unless a proper noun), no trailing period; **subject line ~72 chars or less** when practical.
- **Body:** optional; use for **why** or non-obvious **what** (wrap at ~72 chars). Separate from subject with a blank line.
- **Breaking changes:** `!` after type/scope (e.g. `feat(api)!:`) and/or a `BREAKING CHANGE:` footer when appropriate.

Do not use vague one-word subjects (`fix`, `update`, `wip`) without a clear description after the colon.

## Repo constraints (summary)

- **Signed commits** required on `main` (GPG or SSH) — enforced locally by the post-commit hook and on merge by branch protection.
- **Branch protection:** PR required; CI checks must pass — see [pull-requests.md](pull-requests.md).
- Husky runs Prettier/ESLint/Pint on commit; Commitlint enforces Conventional Commits; post-commit verifies commit signatures. CI rejects Cursor attribution in commit messages and PR descriptions; `.cursor/hooks` blocks `gh pr create` / `gh pr edit` with attribution in `--body`.
