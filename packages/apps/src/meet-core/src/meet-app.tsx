import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import { MeetWorkspace } from "@/meet-core/src/meet-workspace";
import { useMeetAPI } from "@/meet-core/src/use-meet-api";

export function MeetApp() {
  const { phase, error, retry, successVersion, listLoading, data, session, operations } =
    useMeetAPI();

  return (
    <WorkspaceLiveAppShell
      phase={phase}
      error={error}
      retry={retry}
      errorTitle="Could not load live meet"
      successVersion={successVersion}
      render={(key) => (
        <MeetWorkspace
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
