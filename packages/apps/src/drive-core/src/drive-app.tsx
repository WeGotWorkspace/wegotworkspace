import { useCallback, useMemo } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import {
  driveSearchFromView,
  driveViewFromSearch,
  parseDriveRouteSearch,
} from "@/drive-core/src/drive-route-search";
import { docsSearchFromApiPath } from "@/docs-core/src/docs-route-search";
import type { ViewKey } from "@/drive-core/src/drive-models";
import { useDriveAPI } from "@/drive-core/src/use-drive-api";
import { DriveWorkspace } from "@/drive-core/src/drive-workspace";
import type { DriveAppProps } from "@/drive-core/src/drive-app-props";

export function DriveApp({ apiSource }: DriveAppProps = {}) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const { phase, error, retry, successVersion, listLoading, session, data, operations } =
    useDriveAPI(apiSource);

  const routeView = useMemo(
    () => driveViewFromSearch(parseDriveRouteSearch(search as Record<string, unknown>)),
    [search],
  );

  const handleViewChange = useCallback(
    (view: ViewKey) => {
      void navigate({
        to: "/drive",
        search: driveSearchFromView(view),
      });
    },
    [navigate],
  );

  const handleOpenDocsFile = useCallback((apiPath: string) => {
    const file = docsSearchFromApiPath(apiPath).file;
    const query = new URLSearchParams();
    if (file) query.set("file", file);
    const href = `/docs${query.toString() ? `?${query.toString()}` : ""}`;
    window.open(href, "_blank", "noopener,noreferrer");
  }, []);

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
          view={routeView}
          onViewChange={handleViewChange}
          onOpenDocsFile={handleOpenDocsFile}
          onLogout={() => {
            window.location.assign("/logout");
          }}
        />
      )}
    />
  );
}
