import { useMemo } from "react";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { createWeGotWorkspaceStoryRouter } from "@/wegotworkspace/src/wegotworkspace-story-routes";

export type WeGotWorkspaceProps = {
  /** Starting route (default sign-in). */
  initialPath?: string;
};

/**
 * Full WeGotWorkspace shell for Storybook and offline demos: login, app home, and every
 * product workspace with mock bootstrap data (no TanStack Start / live API required).
 */
export function WeGotWorkspace({ initialPath = "/login" }: WeGotWorkspaceProps) {
  const router = useMemo(
    () =>
      createWeGotWorkspaceStoryRouter(
        createMemoryHistory({
          initialEntries: [initialPath],
        }),
      ),
    [initialPath],
  );

  return <RouterProvider router={router} />;
}
