import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import { useDriveAPI } from "@/drive-core/src/use-drive-api";
import { DriveWorkspace } from "@/drive-core/src/drive-workspace";
import type { DriveAppProps } from "@/drive-core/src/drive-app-props";

export function DriveApp({ apiSource }: DriveAppProps = {}) {
  const { phase, error, retry, successVersion, listLoading, session, data, operations } =
    useDriveAPI(apiSource);

  return (
    <WorkspaceLiveAppShell
      phase={phase}
      error={error}
      retry={retry}
      errorTitle="Could not load drive"
      successVersion={successVersion}
      render={(key) => (
        <DriveWorkspace
          key={key}
          data={data}
          session={session}
          operations={operations}
          listLoading={listLoading}
          onLogout={() => {
            window.location.assign("/logout");
          }}
        />
      )}
    />
  );
}
