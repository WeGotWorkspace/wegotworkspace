import { createRootRoute } from "@tanstack/react-router";
import {
  WeGotWorkspaceNotFound,
  WeGotWorkspaceShell,
} from "@/wegotworkspace/src/wegotworkspace-shell";

export { WeGotWorkspaceNotFound, WeGotWorkspaceShell };

export const wegotworkspaceRootRoute = createRootRoute({
  component: WeGotWorkspaceShell,
  notFoundComponent: WeGotWorkspaceNotFound,
});
