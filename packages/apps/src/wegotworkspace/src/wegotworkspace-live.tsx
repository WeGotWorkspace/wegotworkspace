import { useMemo } from "react";
import { createMemoryHistory, RouterProvider } from "@tanstack/react-router";
import { WgwApiRuntimeProvider } from "@/lib/api/wgw/wgw-api-runtime-provider";
import type { WeGotWorkspaceProps } from "@/wegotworkspace/src/wegotworkspace";
import { createWeGotWorkspaceLiveRouter } from "@/wegotworkspace/src/wegotworkspace-live-routes";

export type WeGotWorkspaceLiveProps = WeGotWorkspaceProps & {
  /**
   * REST API origin for WeGotWorkspace (`/api/v1` is appended when missing).
   * Example: `https://wegotworkspace.local:8443` or `/api/v1` (Storybook proxy).
   */
  apiBaseUrl: string;
};

function WeGotWorkspaceLiveRouter({ initialPath = "/login" }: WeGotWorkspaceProps) {
  const router = useMemo(
    () =>
      createWeGotWorkspaceLiveRouter(
        createMemoryHistory({
          initialEntries: [initialPath],
        }),
      ),
    [initialPath],
  );

  return <RouterProvider router={router} />;
}

/**
 * Full WeGotWorkspace shell against a real API: configures fetch base URL for the
 * subtree and renders production `*App` routes (login, home, mail, notes, …).
 */
export function WeGotWorkspaceLive({ apiBaseUrl, initialPath }: WeGotWorkspaceLiveProps) {
  return (
    <WgwApiRuntimeProvider apiBaseUrl={apiBaseUrl}>
      <WeGotWorkspaceLiveRouter initialPath={initialPath} />
    </WgwApiRuntimeProvider>
  );
}
