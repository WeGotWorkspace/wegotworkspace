import { useEffect } from "react";
import type { ReactElement } from "react";
import { clearWgwSession } from "@/lib/api/wgw/http";
import { LiveBootstrapErrorPanel } from "@/lib/live/live-bootstrap-error-panel";

type WorkspaceLiveAppShellProps = {
  phase: "loading" | "ready" | "error";
  error: unknown;
  retry: () => void;
  errorTitle: string;
  successVersion: number;
  render: (successVersion: number) => ReactElement;
};

export function WorkspaceLiveAppShell({
  phase,
  error,
  retry,
  errorTitle,
  successVersion,
  render,
}: WorkspaceLiveAppShellProps) {
  const message = typeof error === "string" ? error : error instanceof Error ? error.message : "";
  const normalized = message.toLowerCase();
  const isAuthError =
    normalized.includes("(401)") ||
    normalized.includes("unauthorized") ||
    normalized.includes("missing or invalid bearer token") ||
    normalized.includes("missing auth session");

  useEffect(() => {
    if (phase !== "error" || typeof window === "undefined") return;
    if (!isAuthError) return;
    clearWgwSession();
    const returnPath = encodeURIComponent(
      `${window.location.pathname}${window.location.search}${window.location.hash}`,
    );
    window.location.assign(`/login?return=${returnPath}`);
  }, [isAuthError, phase]);

  if (phase === "error") {
    if (isAuthError) {
      // Redirect side effect above handles auth failures; avoid showing misleading dev hints.
      return null;
    }
    return <LiveBootstrapErrorPanel title={errorTitle} error={error} onRetry={retry} />;
  }

  return render(successVersion);
}
