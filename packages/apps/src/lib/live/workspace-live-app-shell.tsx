import type { ReactElement } from "react";
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
  if (phase === "error") {
    return <LiveBootstrapErrorPanel title={errorTitle} error={error} onRetry={retry} />;
  }

  return render(successVersion);
}
