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
  useEffect(() => {
    if (phase !== "error" || typeof window === "undefined") return;
    const message = typeof error === "string" ? error : error instanceof Error ? error.message : "";
    const normalized = message.toLowerCase();
    const isAuthError =
      normalized.includes("(401)") ||
      normalized.includes("unauthorized") ||
      normalized.includes("missing or invalid bearer token") ||
      normalized.includes("missing auth session");
    if (!isAuthError) return;
    clearWgwSession();
    window.location.assign("/");
  }, [error, phase]);

  if (phase === "error") {
    return <LiveBootstrapErrorPanel title={errorTitle} error={error} onRetry={retry} />;
  }

  return render(successVersion);
}
