import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import { useSettingsAPI } from "@/settings-core/src/use-settings-api";
import { SettingsWorkspace } from "@/settings-core/src/settings-workspace";

export function SettingsApp() {
  const { phase, error, retry, successVersion, listLoading, session, data, operations } =
    useSettingsAPI();

  return (
    <WorkspaceLiveAppShell
      phase={phase}
      error={error}
      retry={retry}
      errorTitle="Could not load settings"
      successVersion={successVersion}
      render={(key) => (
        <SettingsWorkspace
          key={key}
          data={data}
          session={session}
          operations={operations}
          listLoading={listLoading}
        />
      )}
    />
  );
}
