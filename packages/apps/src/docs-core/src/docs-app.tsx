import { useCallback, useMemo } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { useAppToast } from "@/hooks/use-app-toast";
import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import {
  docsApiPathFromSearch,
  docsSearchFromApiPath,
  openDocsFileInNewWindow,
  parseDocsRouteSearch,
} from "@/docs-core/src/docs-route-search";
import { wgwApiBaseUrl, wgwCurrentAccessToken } from "@/lib/api/wgw/http";
import { encodeFileRoomId } from "@/lib/rtc/room-id";
import type { DocsAppProps } from "@/docs-core/src/docs-app-props";
import { isDocsCollabEditablePath } from "@/docs-core/src/docs-collab-text-files";
import { docsLabels } from "@/docs-core/src/docs-labels";
import { fileNameToBrowserTitle, useDocumentTitle } from "@/lib/document-title";
import { DocsWorkspace } from "@/docs-core/src/docs-workspace";
import { DocsHomeWorkspace } from "@/docs-core/src/docs-home-workspace";
import { DocsCollabWorkspace, useDocsCollabPendingSync } from "@/text-editor-core/docs-collab";
import { createWgwDocsCollabWire } from "@/docs-core/src/docs-collab-wgw-wire";
import { useDocsAPI } from "@/docs-core/src/use-docs-api";
import { createWgwDriveOperations } from "@/lib/api/wgw/drive";
import { getConnectivitySnapshot } from "@/lib/offline/core/browser-online";
import { queueNewDocsOfflineDocument } from "@/lib/offline/docs/docs-offline-pin-core";
import { resolveDocsOfflineUsername } from "@/lib/offline/offline-session";
import { useOfflinePendingToast } from "@/lib/offline/use-offline-sync-toast";

function DocsCollabDocumentTitle({ fileName }: { fileName: string }) {
  useDocumentTitle(fileNameToBrowserTitle(fileName));
  return null;
}

export function DocsApp({ apiSource }: DocsAppProps = {}) {
  const navigate = useNavigate();
  const { showError } = useAppToast();
  const search = useSearch({ strict: false });

  const { phase, error, retry, successVersion, session, data, networkOperations } =
    useDocsAPI(apiSource);

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

  const handleOpenHomeFile = useCallback((apiPath: string) => {
    openDocsFileInNewWindow(apiPath);
  }, []);

  const driveOperations = useMemo(() => createWgwDriveOperations("/"), []);

  const handleCreateHomeDocument = useCallback(
    (apiPath: string) => {
      void (async () => {
        const offlineUsername = resolveDocsOfflineUsername(session.user.username);
        try {
          if (offlineUsername && !getConnectivitySnapshot()) {
            await queueNewDocsOfflineDocument(offlineUsername, apiPath);
          } else {
            await networkOperations.saveFile(apiPath, "");
          }
        } catch {
          showError(docsLabels.homeCreateError);
          return;
        }
        void navigate({
          to: "/docs",
          search: docsSearchFromApiPath(apiPath),
        });
      })();
    },
    [navigate, networkOperations, session.user.username, showError],
  );

  const showCollab = isDocsCollabEditablePath(filePath);
  const collabUrls = useMemo(() => {
    if (!showCollab || !filePath) return undefined;
    const baseUrl = wgwApiBaseUrl();
    const room = filePath.replace(/^\/+/, "");
    const roomId = encodeFileRoomId(`/${room}`);
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
  const pendingCollabSync = useDocsCollabPendingSync(showCollab ? collabUrls?.room : null);
  const collabWire = useMemo(() => createWgwDocsCollabWire(), []);

  useOfflinePendingToast(pendingCollabSync, docsLabels.toastSynced, showCollab);

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
      render={() => (
        <div>
          {filePath === null ? (
            <DocsHomeWorkspace
              session={session}
              offlineUsername={resolveDocsOfflineUsername(session.user.username)}
              operations={driveOperations}
              onOpenFile={handleOpenHomeFile}
              onCreateDocument={handleCreateHomeDocument}
              onLogout={handleLogout}
            />
          ) : showCollab && collabUrls ? (
            <>
              {phase === "ready" && collabDocumentTitle ? (
                <DocsCollabDocumentTitle fileName={collabDocumentTitle} />
              ) : null}
              <DocsCollabWorkspace
                userName={collabUserName}
                documentTitle={collabDocumentTitle}
                urls={collabUrls}
                wire={collabWire}
                onLogout={handleLogout}
              />
            </>
          ) : (
            <DocsWorkspace
              data={data}
              session={session}
              operations={networkOperations}
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
