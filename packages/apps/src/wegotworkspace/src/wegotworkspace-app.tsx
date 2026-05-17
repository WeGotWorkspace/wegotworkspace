import { useMemo } from "react";
import { createBrowserHistory } from "@tanstack/react-router";
import { normalizeWgwApiBaseUrl } from "@/lib/api/wgw/wgw-api-runtime";
import { WgwApiRuntimeProvider } from "@/lib/api/wgw/wgw-api-runtime-provider";
import { WeGotWorkspaceRouter } from "@/wegotworkspace/src/wegotworkspace-router";

export function resolveProductionApiBaseUrl(): string {
  const fromEnv = import.meta.env.VITE_WGW_API_BASE_URL as string | undefined;
  if (fromEnv?.trim()) {
    return normalizeWgwApiBaseUrl(fromEnv);
  }
  return "/api/v1";
}

/**
 * Production WeGotWorkspace client: browser history, live API, all product apps.
 */
export function WeGotWorkspaceApp() {
  const apiBaseUrl = useMemo(() => resolveProductionApiBaseUrl(), []);
  const history = useMemo(() => createBrowserHistory(), []);

  return (
    <WgwApiRuntimeProvider apiBaseUrl={apiBaseUrl}>
      <WeGotWorkspaceRouter mode="live" history={history} />
    </WgwApiRuntimeProvider>
  );
}
