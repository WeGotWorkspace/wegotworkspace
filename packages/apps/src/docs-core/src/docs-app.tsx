import { useCallback, useMemo } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import {
  docsApiPathFromSearch,
  docsSearchFromApiPath,
  parseDocsRouteSearch,
} from "@/docs-core/src/docs-route-search";
import { wgwApiBaseUrl, wgwCurrentAccessToken } from "@/lib/api/wgw/http";
import { encodeFileRoomId } from "@/lib/rtc/room-id";
import type { DocsAppProps } from "@/docs-core/src/docs-app-props";
import { DocsWorkspace } from "@/docs-core/src/docs-workspace";
import { DocsCollabWorkspace } from "@/text-editor-core/docs-collab";
import { useDocsAPI } from "@/docs-core/src/use-docs-api";

function isMyDriveDocPath(
  filePath: string | null | undefined,
  username: string | null | undefined,
): boolean {
  const trimmedPath = filePath?.trim();
  const trimmedUsername = username?.trim();
  if (!trimmedPath || !trimmedUsername) return false;
  const myRoot = `/users/${trimmedUsername}`;
  return trimmedPath === myRoot || trimmedPath.startsWith(`${myRoot}/`);
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

  const fileIsMyDriveDoc = isMyDriveDocPath(filePath, session.user.username);
  const showCollab =
    typeof filePath === "string" && /\.(md|txt)$/i.test(filePath) && !fileIsMyDriveDoc;
  const collabUrls = useMemo(() => {
    if (!showCollab || !filePath) return undefined;
    const baseUrl = wgwApiBaseUrl();
    const room = filePath;
    const roomId = encodeFileRoomId(room);
    const pathQuery = encodeURIComponent(room);
    return {
      signalUrl: `${baseUrl}/rooms/${encodeURIComponent(roomId)}/events`,
      collabApiBaseUrl: `${baseUrl}/rooms`,
      collabRtcUrl: `${baseUrl}/rooms/${encodeURIComponent(roomId)}/configuration`,
      authToken: wgwCurrentAccessToken() ?? undefined,
      documentUrl: `${baseUrl}/files/collaboration?path=${pathQuery}`,
      yjsUrl: `${baseUrl}/files/collaboration?path=${pathQuery}&format=yjs`,
      documentSaveMethod: "PUT" as const,
      room,
    };
  }, [filePath, showCollab]);
  const collabUserName = session.user.displayName || session.user.username || "User";
  const collabDocumentTitle = useMemo(() => {
    if (!filePath) return undefined;
    const normalized = filePath.replace(/\/+$/, "");
    const slash = normalized.lastIndexOf("/");
    return slash >= 0 ? normalized.slice(slash + 1) : normalized;
  }, [filePath]);

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
            <DocsCollabWorkspace
              userName={collabUserName}
              documentTitle={collabDocumentTitle}
              urls={collabUrls}
            />
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
