import { useCallback, useMemo, useState } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import {
  docsApiPathFromSearch,
  docsSearchFromApiPath,
  parseDocsRouteSearch,
} from "@/docs-core/src/docs-route-search";
import { wgwApiBaseUrl, wgwCurrentAccessToken } from "@/lib/api/wgw/http";
import { encodeFileRoomId } from "@/lib/rtc/room-id";
import {
  resolveDocsConflictKeepLocal,
  resolveDocsConflictUseServer,
} from "@/lib/offline/docs/docs-conflict-resolution";
import { resolveDocsOfflineUsername } from "@/lib/offline/offline-session";
import type { DocsAppProps } from "@/docs-core/src/docs-app-props";
import { DocsConflictDialog } from "@/docs-core/src/docs-conflict-dialog";
import { docsLabels } from "@/docs-core/src/docs-labels";
import { DocsWorkspace } from "@/docs-core/src/docs-workspace";
import { DocsCollabWorkspace } from "@/text-editor-core/docs-collab";
import { createWgwDocsCollabWire } from "@/docs-core/src/docs-collab-wgw-wire";
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
  const [conflictQueue, setConflictQueue] = useState<string[]>([]);
  const [resolvingConflict, setResolvingConflict] = useState(false);

  const handleSyncConflict = useCallback((apiPaths: string[]) => {
    setConflictQueue((prev) => {
      const next = [...prev];
      for (const path of apiPaths) {
        if (!next.includes(path)) next.push(path);
      }
      return next;
    });
  }, []);

  const {
    phase,
    error,
    retry,
    successVersion,
    session,
    data,
    hybridOperations,
    networkOperations,
  } = useDocsAPI(apiSource, { onSyncConflict: handleSyncConflict });

  const filePath = useMemo(
    () => docsApiPathFromSearch(parseDocsRouteSearch(search as Record<string, unknown>).file),
    [search],
  );

  const fileIsMyDriveDoc = isMyDriveDocPath(filePath, session.user.username);
  const operations = fileIsMyDriveDoc ? hybridOperations : networkOperations;

  const offlineUsername = resolveDocsOfflineUsername(session.user.username);
  const activeConflictPath = conflictQueue[0] ?? null;
  const activeConflictTitle = activeConflictPath
    ? activeConflictPath.split("/").pop() || activeConflictPath
    : "";

  const dismissActiveConflict = useCallback(() => {
    setConflictQueue((prev) => prev.slice(1));
  }, []);

  const resolveActiveConflict = useCallback(
    (mode: "local" | "server") => {
      if (!activeConflictPath || !offlineUsername) {
        dismissActiveConflict();
        return;
      }
      const apiPath = activeConflictPath;
      const username = offlineUsername;
      setResolvingConflict(true);
      void (async () => {
        try {
          if (mode === "local") {
            await resolveDocsConflictKeepLocal(username, apiPath);
          } else {
            await resolveDocsConflictUseServer(username, apiPath);
          }
        } catch {
          // Resolution best-effort; the workspace reloads the latest cached state.
        } finally {
          setResolvingConflict(false);
          dismissActiveConflict();
        }
      })();
    },
    [activeConflictPath, offlineUsername, dismissActiveConflict],
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
    <>
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
                wire={createWgwDocsCollabWire()}
              />
            ) : (
              <DocsWorkspace
                data={data}
                session={session}
                operations={operations}
                filePath={filePath}
                offlineEnabled={fileIsMyDriveDoc}
                onLogout={handleLogout}
                onFileRenamed={handleFileRenamed}
              />
            )}
          </div>
        )}
      />
      <DocsConflictDialog
        open={activeConflictPath !== null}
        documentTitle={activeConflictTitle}
        remainingCount={Math.max(conflictQueue.length - 1, 0)}
        busy={resolvingConflict}
        labels={docsLabels}
        onKeepLocal={() => resolveActiveConflict("local")}
        onUseServer={() => resolveActiveConflict("server")}
        onOpenChange={(open) => {
          if (!open && !resolvingConflict) dismissActiveConflict();
        }}
      />
    </>
  );
}
