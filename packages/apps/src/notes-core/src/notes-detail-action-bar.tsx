import { Archive, ArchiveRestore, BookOpen, MoreHorizontal, Star } from "lucide-react";
import { ActionBar } from "@/action-bar/src/action-bar";
import type { Note } from "@/lib/models/note";
import type { NotesUILabels } from "@/notes-core/src/notes-labels";

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

  const rightActions = [
    {
      id: "move-to-notebook",
      label: labels.toolbarMoveToNotebook,
      onClick: () => openMoveDialog([active.id]),
      icon: <BookOpen />,
    },
    {
      id: "toggle-star",
      label: labels.toolbarStar,
      onClick: () => toggleStar(active.id),
      active: !!starred[active.id],
      icon: <Star />,
    },
    {
      id: "toggle-archive",
      label: archived[active.id] ? labels.toolbarUnarchive : labels.toolbarArchive,
      onClick: () => toggleArchive(active.id),
      active: !!archived[active.id],
      icon: archived[active.id] ? <ArchiveRestore /> : <Archive />,
    },
  ];

  return (
    <ActionBar
      onBack={closeMobileDetail}
      rightActions={rightActions}
      rightMenuLabel="More actions"
      rightMenuIcon={<MoreHorizontal />}
    />
  );
}
