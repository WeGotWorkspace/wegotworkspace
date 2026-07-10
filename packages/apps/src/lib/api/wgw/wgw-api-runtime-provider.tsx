import { useEffect, useMemo, useState, type ReactNode } from "react";
import { LoadingSpinner } from "@/loading-spinner/src/loading-spinner";
import { wgwEnsureSession } from "@/lib/api/wgw/http";
import { normalizeWgwApiBaseUrl, pushWgwApiRuntime } from "@/lib/api/wgw/wgw-api-runtime";
import { startWgwSessionKeeper } from "@/lib/api/wgw/session-keeper";

type WgwApiRuntimeProviderProps = {
  /** REST API root (with or without trailing `/api/v1`). */
  apiBaseUrl: string;
  children: ReactNode;
};

/** Scope live API base URL and mode to a React subtree (Storybook, embedded shell, etc.). */
export function WgwApiRuntimeProvider({ apiBaseUrl, children }: WgwApiRuntimeProviderProps) {
  const normalizedBaseUrl = useMemo(() => normalizeWgwApiBaseUrl(apiBaseUrl), [apiBaseUrl]);
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    return pushWgwApiRuntime({
      baseUrl: normalizedBaseUrl,
      useLiveApi: true,
    });
  }, [normalizedBaseUrl]);

  useEffect(() => {
    let cancelled = false;
    setSessionReady(false);
    void (async () => {
      try {
        await wgwEnsureSession();
      } catch {
        // No stored session and no dev auto-login — login route will handle sign-in.
      } finally {
        if (!cancelled) setSessionReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [normalizedBaseUrl]);

  useEffect(() => {
    if (!sessionReady) return;
    return startWgwSessionKeeper();
  }, [sessionReady]);

  if (!sessionReady) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center p-8">
        <LoadingSpinner size="lg" label="Restoring session…" />
      </div>
    );
  }

  return children;
}
