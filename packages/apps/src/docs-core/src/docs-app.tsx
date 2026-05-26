import { useCallback, useMemo } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import {
  docsApiPathFromSearch,
  docsSearchFromApiPath,
  parseDocsRouteSearch,
} from "@/docs-core/src/docs-route-search";
import { wgwApiBaseUrl, wgwCurrentAccessToken } from "@/lib/api/wgw/http";
import type { DocsAppProps } from "@/docs-core/src/docs-app-props";
import { DocsWorkspace } from "@/docs-core/src/docs-workspace";
import { LaatsteTestDocsCollabWorkspace } from "@/text-editor-core/laatste-test-collab/laatste-test-docs-collab-workspace";
import { useDocsAPI } from "@/docs-core/src/use-docs-api";

function docsCollabEnabled(): boolean {
  const raw = (import.meta.env.VITE_WGW_DOCS_COLLAB as string | undefined)?.trim().toLowerCase();
  return raw === "1" || raw === "true" || raw === "yes" || raw === "on";
}

export function DocsApp({ apiSource }: DocsAppProps = {}) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const { phase, error, retry, successVersion, session, data, operations } = useDocsAPI(apiSource);

  const filePath = useMemo(
    () => docsApiPathFromSearch(parseDocsRouteSearch(search as Record<string, unknown>).file),
    [search],
  );

  const handleLogout = useCallback(() => {
    window.location.assign("/logout");
  }, []);

  const handleFileRenamed = useCallback(
    (apiPath: string) => {
      void navigate({
        to: "/docs",
        search: docsSearchFromApiPath(apiPath),
      });
    },
    [navigate],
  );

  const showCollab =
    docsCollabEnabled() && typeof filePath === "string" && /\.(md|txt)$/i.test(filePath);
  const collabUrls = useMemo(() => {
    if (!showCollab || !filePath) return undefined;
    const baseUrl = wgwApiBaseUrl();
    const room = filePath;
    const encodedRoom = encodeURIComponent(room);
    return {
      signalUrl: `${baseUrl}/collab/send`,
      collabApiBaseUrl: `${baseUrl}/collab`,
      authToken: wgwCurrentAccessToken() ?? undefined,
      documentUrl: `${baseUrl}/collab/document?room=${encodedRoom}`,
      yjsUrl: `${baseUrl}/collab/document?room=${encodedRoom}&format=yjs`,
      documentSaveMethod: "PUT" as const,
      room,
    };
  }, [filePath, showCollab]);
  const collabUserName = session.user.displayName || session.user.username || "User";

  return (
    <WorkspaceLiveAppShell
      phase={phase}
      error={error}
      retry={retry}
      errorTitle="Could not load docs"
      successVersion={successVersion}
      render={(key) => (
        <div key={key}>
          {showCollab && collabUrls ? (
            <LaatsteTestDocsCollabWorkspace userName={collabUserName} urls={collabUrls} />
          ) : (
            <DocsWorkspace
              data={data}
              session={session}
              operations={operations}
              filePath={filePath}
              onLogout={handleLogout}
              onFileRenamed={handleFileRenamed}
            />
          )}
        </div>
      )}
    />
  );
}
