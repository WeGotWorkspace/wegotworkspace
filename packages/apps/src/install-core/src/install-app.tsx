import { buildWgwLoginHref } from "@/lib/api/wgw/route-guard";
import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import { InstallWorkspace } from "@/install-core/src/install-workspace";
import { useInstallAPI } from "@/install-core/src/use-install-api";

export function InstallApp() {
  const { phase, error, retry, successVersion, data, operations } = useInstallAPI();

  return (
    <WorkspaceLiveAppShell
      phase={phase}
      error={error}
      retry={retry}
      errorTitle="Could not load installer"
      successVersion={successVersion}
      render={(key) => (
        <InstallWorkspace
          key={key}
          data={data}
          operations={operations}
          onInstallRedirect={(url) => {
            if (typeof window !== "undefined") {
              window.location.assign(url);
            }
          }}
          onOpenAdmin={() => {
            if (typeof window !== "undefined") {
              window.location.assign(buildWgwLoginHref("/admin"));
            }
          }}
        />
      )}
    />
  );
}
