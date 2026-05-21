import { useEffect, useMemo, type ReactNode } from "react";
import { normalizeWgwApiBaseUrl, pushWgwApiRuntime } from "@/lib/api/wgw/wgw-api-runtime";

type WgwApiRuntimeProviderProps = {
  /** REST API root (with or without trailing `/api/v1`). */
  apiBaseUrl: string;
  children: ReactNode;
};

/** Scope live API base URL and mode to a React subtree (Storybook, embedded shell, etc.). */
export function WgwApiRuntimeProvider({ apiBaseUrl, children }: WgwApiRuntimeProviderProps) {
  const normalizedBaseUrl = useMemo(() => normalizeWgwApiBaseUrl(apiBaseUrl), [apiBaseUrl]);

  useEffect(() => {
    return pushWgwApiRuntime({
      baseUrl: normalizedBaseUrl,
      useLiveApi: true,
    });
  }, [normalizedBaseUrl]);

  return children;
}
