import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Check } from "lucide-react";
import { useLocation, useNavigate, useParams } from "@tanstack/react-router";
import { useAppToast } from "@/hooks/use-app-toast";
import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import {
  resolveNotesConflictKeepLocal,
  resolveNotesConflictUseServer,
} from "@/lib/offline/notes-conflict-resolution";
import { resolveNotesOfflineUsername } from "@/lib/offline/offline-session";
import type { Note } from "@/lib/models/note";
import type { NotesApiSource } from "@/notes-core/src/notes-api-source";
import { NotesConflictDialog } from "@/notes-core/src/notes-conflict-dialog";
import { noteListTitle } from "@/notes-core/src/notes-note-utils";
import { defaultNotesLabels } from "@/notes-core/src/notes-labels";
import {
  notesNavigateTarget,
  notesNoteFromParams,
  notesViewFromLocation,
} from "@/notes-core/src/notes-route-search";
import { NotesWorkspace } from "@/notes-core/src/notes-workspace";
import { useNotesAPI } from "@/notes-core/src/use-notes-api";

export type NotesAppProps = {
  /** When set (e.g. Storybook live story), bypasses `wgwLiveApiEnabled()` routing. */
  apiSource?: NotesApiSource;
};

export function NotesApp({ apiSource }: NotesAppProps = {}) {
  const navigate = useNavigate();
  const location = useLocation();
  const params = useParams({ strict: false }) as {
    tagSlug?: string;
    notebookSlug?: string;
    noteId?: string;
  };

  const notesRef = useRef<Note[]>([]);
  const [conflictQueue, setConflictQueue] = useState<string[]>([]);
  const [resolvingConflict, setResolvingConflict] = useState(false);
  const wasSyncingRef = useRef(false);
  const { show } = useAppToast();

  const handleSyncConflict = useCallback((noteIds: string[]) => {
    setConflictQueue((prev) => {
      const next = [...prev];
      for (const id of noteIds) {
        if (!next.includes(id)) next.push(id);
      }
      return next;
    });
  }, []);

  const {
    phase,
    error,
    retry,
    successVersion,
    bootstrapRevision,
    syncing,
    listLoading,
    refreshList,
    data,
    session,
    operations,
  } = useNotesAPI(apiSource, { onSyncConflict: handleSyncConflict });

  useEffect(() => {
    if (wasSyncingRef.current && !syncing) {
      show(defaultNotesLabels.toastSynced, { icon: <Check className="size-4" /> });
    }
    wasSyncingRef.current = syncing;
  }, [show, syncing]);

  notesRef.current = data.notes;

  const offlineUsername = resolveNotesOfflineUsername(session.user.username);
  const activeConflictId = conflictQueue[0] ?? null;
  const activeConflictNote = activeConflictId
    ? notesRef.current.find((n) => n.id === activeConflictId)
    : undefined;
  const activeConflictTitle = activeConflictNote
    ? noteListTitle(activeConflictNote)
    : activeConflictId || "";

  const dismissActiveConflict = useCallback(() => {
    setConflictQueue((prev) => prev.slice(1));
  }, []);

  const resolveActiveConflict = useCallback(
    (mode: "local" | "server") => {
      if (!activeConflictId || !offlineUsername) {
        dismissActiveConflict();
        return;
      }
      const noteId = activeConflictId;
      const username = offlineUsername;
      setResolvingConflict(true);
      void (async () => {
        try {
          if (mode === "local") {
            await resolveNotesConflictKeepLocal(username, noteId);
          } else {
            await resolveNotesConflictUseServer(username, noteId);
          }
        } catch {
          // Resolution best-effort; refresh below re-reads the latest state.
        } finally {
          setResolvingConflict(false);
          dismissActiveConflict();
          refreshList();
        }
      })();
    },
    [activeConflictId, offlineUsername, dismissActiveConflict, refreshList],
  );

  const initialView = useMemo(
    () => notesViewFromLocation(location.pathname, params),
    [location.pathname, params],
  );
  const initialNoteId = useMemo(() => notesNoteFromParams(params), [params]);

  const currentViewRef = useRef<string>(initialView);
  const currentNoteRef = useRef<string>(initialNoteId);

  useEffect(() => {
    currentViewRef.current = initialView;
  }, [initialView]);

  useEffect(() => {
    currentNoteRef.current = initialNoteId;
  }, [initialNoteId]);

  const handleViewChange = useCallback(
    (view: string) => {
      currentViewRef.current = view;
      currentNoteRef.current = "";
      const target = notesNavigateTarget(view);
      void navigate({ ...target, replace: true });
    },
    [navigate],
  );

  const handleNoteChange = useCallback(
    (noteId: string) => {
      currentNoteRef.current = noteId;
      const view = currentViewRef.current;
      const target = notesNavigateTarget(view, noteId);
      void navigate({ ...target, replace: true });
    },
    [navigate],
  );

  return (
    <>
      <WorkspaceLiveAppShell
        phase={phase}
        error={error}
        retry={retry}
        errorTitle="Could not load live notes"
        successVersion={successVersion}
        render={(key) => (
          <NotesWorkspace
            key={key}
            data={data}
            session={session}
            operations={operations}
            listLoading={listLoading}
            bootstrapRevision={bootstrapRevision}
            onRefreshList={refreshList}
            initialView={initialView}
            initialNoteId={initialNoteId}
            onViewChange={handleViewChange}
            onNoteChange={handleNoteChange}
            onLogout={() => {
              window.location.assign("/logout");
            }}
          />
        )}
      />
      <NotesConflictDialog
        open={activeConflictId !== null}
        noteTitle={activeConflictTitle}
        remainingCount={Math.max(conflictQueue.length - 1, 0)}
        busy={resolvingConflict}
        labels={defaultNotesLabels}
        onKeepLocal={() => resolveActiveConflict("local")}
        onUseServer={() => resolveActiveConflict("server")}
        onOpenChange={(open) => {
          if (!open && !resolvingConflict) dismissActiveConflict();
        }}
      />
    </>
  );
}
