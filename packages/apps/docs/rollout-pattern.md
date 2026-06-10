# App shell migration index

Use **[workspace-shells.md](./workspace-shells.md)** to choose a shell pattern (split, collection, or custom) and required imports. This file tracks rollout status only — it does not duplicate the pattern guide.

## Canonical references

| Doc                                                                         | Purpose                                                                 |
| --------------------------------------------------------------------------- | ----------------------------------------------------------------------- |
| [workspace-shells.md](./workspace-shells.md)                                | Split vs collection vs custom — decision matrix, imports, anti-patterns |
| [workspace SKILL.md](../../.agents/skills/workspace/SKILL.md)               | `AppSidebar` scrim, navigation callbacks, toasts, deferred writes       |
| [feature-blueprint.md](../../.agents/skills/workspace/feature-blueprint.md) | Split products: `*App` / `*Workspace` / controller / pane layers        |
| [apps-done-gate.md](../../.agents/skills/testing/apps-done-gate.md)         | Verification before merge (`pnpm test:apps-done-gate`)                  |

## Applied so far

All routed product workspaces use shared shell components. See the full catalog in [workspace-shells.md](./workspace-shells.md#-core-app-catalog).

| Product  | Shell      | Entry                                      |
| -------- | ---------- | ------------------------------------------ |
| settings | Split      | `WorkspaceAppLayout` + `AppSidebar`        |
| admin    | Split      | `WorkspaceAppLayout` + `AppSidebar`        |
| drive    | Split      | `WorkspaceAppLayout` + `AppSidebar`        |
| install  | Split      | `WorkspaceAppLayout` + `AppSidebar`        |
| docs     | Split      | `WorkspaceAppLayout` + `AppSidebar`        |
| mail     | Collection | `WorkspaceApp` + `AppSidebar`              |
| notes    | Collection | `WorkspaceApp` + `AppSidebar`              |
| meet     | Custom     | `WorkspaceShellHeader` + lobby/room layout |

Shared chrome: `AppSidebar` (mobile scrim built in), `WorkspaceUserFooter`, `ViewHeader` / `CollectionSearchInput` where applicable. Product code should follow the patterns in workspace-shells.md — do not hand-roll sidebar scrims or split main-column scroll wrappers.

## Refactoring a route

1. Pick shell pattern — [workspace-shells.md](./workspace-shells.md)
2. For split products, follow [feature-blueprint.md](../../.agents/skills/workspace/feature-blueprint.md)
3. Run the [apps done gate](../../.agents/skills/testing/apps-done-gate.md) before handoff

No outstanding shell migrations are tracked here. Further work is product-level alignment with the feature blueprint (controller hooks, pane extraction, Storybook coverage).
