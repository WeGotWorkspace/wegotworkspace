import { useMemo } from "react";
import { createMemoryHistory } from "@tanstack/react-router";
import { WgwApiRuntimeProvider } from "@/lib/api/wgw/wgw-api-runtime-provider";
import type { WeGotWorkspaceProps } from "@/wegotworkspace/src/wegotworkspace";
import { WeGotWorkspaceRouter } from "@/wegotworkspace/src/wegotworkspace-router";

export type WeGotWorkspaceLiveProps = WeGotWorkspaceProps & {
  /**
   * REST API origin for WeGotWorkspace (`/api/v1` is appended when missing).
   * Example: `https://wegotworkspace.local:8443` or `/api/v1` (Storybook proxy).
   */
  apiBaseUrl: string;
};

/**
 * Live API shell for Storybook manual testing (memory history + configurable base URL).
 * Production uses {@link WeGotWorkspaceApp} with browser history instead.
 */
export function WeGotWorkspaceLive({
  apiBaseUrl,
  initialPath = "/login",
}: WeGotWorkspaceLiveProps) {
  const history = useMemo(
    () =>
      createMemoryHistory({
        initialEntries: [initialPath],
      }),
    [initialPath],
  );

  return (
    <WgwApiRuntimeProvider apiBaseUrl={apiBaseUrl}>
      <WeGotWorkspaceRouter mode="live" history={history} />
    </WgwApiRuntimeProvider>
  );
}
