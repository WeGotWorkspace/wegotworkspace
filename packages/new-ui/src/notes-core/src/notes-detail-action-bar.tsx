import { Archive, ArchiveRestore, FolderInput, Star } from "lucide-react";
import { ToolbarButton } from "@/action-buttons/src/action-buttons";
import { ActionBar } from "@/action-bar/src/action-bar";
import type { Note } from "@/lib/models/note";
import type { NotesUILabels } from "@/notes-core/src/notes-app.stories.fixtures";

type NotesDetailActionBarProps = {
  active: Note | undefined;
  labels: NotesUILabels;
  archived: Record<string, boolean>;
  starred: Record<string, boolean>;
  closeMobileDetail: () => void;
  openMoveDialog: (ids: string[]) => void;
  toggleStar: (id: string) => void;
  toggleArchive: (id: string) => void;
};

export function NotesDetailActionBar({
  active,
  labels,
  archived,
  starred,
  closeMobileDetail,
  openMoveDialog,
  toggleStar,
  toggleArchive,
}: NotesDetailActionBarProps) {
  if (!active) {
    return <ActionBar onBack={closeMobileDetail} />;
  }

  return (
    <ActionBar
      onBack={closeMobileDetail}
      right={
        <>
          <ToolbarButton
            label={labels.toolbarMoveToNotebook}
            onClick={() => openMoveDialog([active.id])}
          >
            <FolderInput className="size-4" />
          </ToolbarButton>
          <ToolbarButton
            label={labels.toolbarStar}
            onClick={() => toggleStar(active.id)}
            active={!!starred[active.id]}
          >
            <Star className="size-4" fill={starred[active.id] ? "currentColor" : "none"} />
          </ToolbarButton>
          <ToolbarButton
            label={archived[active.id] ? labels.toolbarUnarchive : labels.toolbarArchive}
            onClick={() => toggleArchive(active.id)}
            active={!!archived[active.id]}
          >
            {archived[active.id] ? (
              <ArchiveRestore className="size-4" />
            ) : (
              <Archive className="size-4" />
            )}
          </ToolbarButton>
        </>
      }
    />
  );
}
