# App Library Rollout Pattern

Use this checklist when migrating an app route from monolith UI to the shared app library.

## Route Migration Steps

1. Replace inline app chrome with shared shell components:
   - `WorkspaceRoot`
   - `WorkspaceSidebar`
   - `WorkspaceBrandHeader`
   - `WorkspaceUserFooter`
   - `WorkspaceSidebarScrim`
   - `WorkspaceSidebarToggle`
2. Replace route-level list pane wrappers with:
   - `CollectionListPane`
   - `CollectionHeader`
   - `CollectionSearchInput`
3. Move route seed constants into `src/lib/adapters/mock/*`.
4. Keep route files focused on metadata and composition.
5. Use `createPwaHead()` to keep route head metadata consistent.

## Applied So Far

- `notes` route
- `mail` route
- `meet` and `meet_/guest` now share `BrandMark`

## Next Targets

- `drive` route
- `settings` route
- `admin` route
- `install` route
