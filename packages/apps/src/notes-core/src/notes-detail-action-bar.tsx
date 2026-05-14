import { Archive, ArchiveRestore, BookOpen, Star } from "lucide-react";
import { IconButton } from "@/button/src/button";
import { TOOLBAR_ICON_BUTTON_STYLE } from "@/button/src/icon-button-presets";
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
          <IconButton
            label={labels.toolbarMoveToNotebook}
            onClick={() => openMoveDialog([active.id])}
            icon={<BookOpen />}
            variant="subtle"
            style={TOOLBAR_ICON_BUTTON_STYLE}
          />
          <IconButton
            label={labels.toolbarStar}
            onClick={() => toggleStar(active.id)}
            active={!!starred[active.id]}
            icon={<Star />}
            variant="subtle"
            style={TOOLBAR_ICON_BUTTON_STYLE}
          />
          <IconButton
            label={archived[active.id] ? labels.toolbarUnarchive : labels.toolbarArchive}
            onClick={() => toggleArchive(active.id)}
            active={!!archived[active.id]}
            icon={
              archived[active.id] ? (
                <ArchiveRestore className="size-4" />
              ) : (
                <Archive className="size-4" />
              )
            }
            variant="subtle"
            style={TOOLBAR_ICON_BUTTON_STYLE}
          />
        </>
      }
    />
  );
}
