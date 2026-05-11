import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import { InstallWorkspace } from "@/routes/install";
import { useInstallAPI } from "./use-install-api";

export function InstallApp() {
  const { phase, error, retry, successVersion, bootstrap } = useInstallAPI();
  return (
    <WorkspaceLiveAppShell
      phase={phase}
      error={error}
      retry={retry}
      errorTitle="Could not load installer"
      successVersion={successVersion}
      render={(key) => <InstallWorkspace key={key} bootstrapState={bootstrap?.state ?? null} />}
    />
  );
}
