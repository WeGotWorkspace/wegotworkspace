import type { ReactElement } from "react";
import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import { useDriveAPI } from "@/drive-core/src/use-drive-api";
import type { DriveAPIOperations, DriveUIData } from "@/drive-core/src/drive-types";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";

export type DriveWorkspaceRenderProps = {
  data: DriveUIData;
  session: WorkspaceSession;
  operations?: DriveAPIOperations;
  listLoading: boolean;
  successVersion: number;
};

export function DriveApp({
  renderWorkspace,
}: {
  renderWorkspace: (props: DriveWorkspaceRenderProps) => ReactElement;
}) {
  const { phase, error, retry, successVersion, listLoading, session, data, operations } =
    useDriveAPI();

  return (
    <WorkspaceLiveAppShell
      phase={phase}
      error={error}
      retry={retry}
      errorTitle="Could not load drive"
      successVersion={successVersion}
      render={() =>
        renderWorkspace({
          data,
          session,
          operations,
          listLoading,
          successVersion,
        })
      }
    />
  );
}
