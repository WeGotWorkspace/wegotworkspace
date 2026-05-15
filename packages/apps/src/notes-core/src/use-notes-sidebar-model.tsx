import { useMemo } from "react";
import { Archive, BookOpen, Files, Star, Tag } from "lucide-react";
import type { NotesUILabels } from "@/notes-core/src/notes-labels";

type UseNotesSidebarModelArgs = {
  labels: NotesUILabels;
  view: string;
  notebooks: string[];
  tags: string[];
  selectView: (view: string) => void;
  sidebarDropZoneProps: (
    target: string,
    onDrop: (ids: string[]) => void,
  ) => Record<string, unknown>;
  moveToNotebook: (ids: string[], notebook: string) => void;
  assignTagToNotes: (ids: string[], tag: string) => void;
};

export function useNotesSidebarModel({
  labels,
  view,
  notebooks,
  tags,
  selectView,
  sidebarDropZoneProps,
  moveToNotebook,
  assignTagToNotes,
}: UseNotesSidebarModelArgs) {
  const primarySidebarItems = useMemo(
    () => [
      {
        label: labels.sidebarAllItems,
        icon: <Files className="size-3.5" />,
        selected: view === "all",
        onClick: () => selectView("all"),
      },
      {
        label: labels.sidebarStarred,
        icon: <Star className="size-3.5" />,
        selected: view === "starred",
        onClick: () => selectView("starred"),
      },
      {
        label: labels.sidebarArchive,
        icon: <Archive className="size-3.5" />,
        selected: view === "archive",
        onClick: () => selectView("archive"),
      },
    ],
    [labels.sidebarAllItems, labels.sidebarArchive, labels.sidebarStarred, selectView, view],
  );

  const notebookSidebarItems = useMemo(
    () =>
      notebooks.map((nb) => ({
        label: nb,
        icon: <BookOpen className="size-3.5" />,
        selected: view === `nb:${nb}`,
        onClick: () => selectView(`nb:${nb}`),
        ...sidebarDropZoneProps(`nb:${nb}`, (ids) => moveToNotebook(ids, nb)),
      })),
    [moveToNotebook, notebooks, selectView, sidebarDropZoneProps, view],
  );

  const tagSidebarItems = useMemo(
    () =>
      tags.map((tag) => ({
        label: tag,
        icon: <Tag className="size-3.5" />,
        selected: view === `tag:${tag}`,
        onClick: () => selectView(`tag:${tag}`),
        ...sidebarDropZoneProps(`tag:${tag}`, (ids) => assignTagToNotes(ids, tag)),
      })),
    [assignTagToNotes, selectView, sidebarDropZoneProps, tags, view],
  );

  return {
    primarySidebarItems,
    notebookSidebarItems,
    tagSidebarItems,
  };
}
