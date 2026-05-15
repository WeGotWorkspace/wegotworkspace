import { useEffect, useMemo, useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { createNotesAppBootstrap } from "@/lib/api/mock/notes-bootstrap";
import { NotesDetailActionBar } from "@/notes-core/src/notes-detail-action-bar";
import { defaultNotesLabels } from "@/notes-core/src/notes-labels";
import { useStarredMap } from "@/hooks/use-starred-map";
import { notesDetailPaneDecorator } from "./notes-panes.stories.decorator";

function NotesDetailActionBarHarness({
  archived: archivedInitial = false,
  starred: starredInitial = false,
}: {
  archived?: boolean;
  starred?: boolean;
}) {
  const data = useMemo(() => createNotesAppBootstrap().data, []);
  const active = data.notes[0];

  const { starred: starredMap, toggleStar, setStarred } = useStarredMap({});
  const [archivedMap, setArchivedMap] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (!active?.id) return;
    setStarred({ [active.id]: starredInitial });
    setArchivedMap({ [active.id]: archivedInitial });
  }, [active?.id, archivedInitial, starredInitial, setStarred]);

  if (!active) {
    return (
      <p className="text-sm text-[color-mix(in_oklab,var(--color-ink)_55%,transparent)]">
        No notes in bootstrap seed for this story.
      </p>
    );
  }

  return (
    <div
      className="sticky top-0 z-10 border-b px-2 py-2"
      style={{
        borderColor: "color-mix(in oklab, var(--color-ink) 10%, transparent)",
        backgroundColor: "var(--color-cream, #f5f1e8)",
      }}
    >
      <NotesDetailActionBar
        active={active}
        labels={defaultNotesLabels}
        archived={archivedMap}
        starred={starredMap}
        closeMobileDetail={() => {}}
        openMoveDialog={() => {}}
        toggleStar={toggleStar}
        toggleArchive={(id) => {
          setArchivedMap((prev) => ({
            ...prev,
            [id]: !prev[id],
          }));
        }}
      />
    </div>
  );
}

const meta = {
  title: "Apps/Notes/Panes/Detail action bar",
  component: NotesDetailActionBarHarness,
  decorators: [notesDetailPaneDecorator],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof NotesDetailActionBarHarness>;

export default meta;
type Story = StoryObj<typeof NotesDetailActionBarHarness>;

export const Default: Story = {
  args: {},
};

export const Starred: Story = {
  args: { starred: true },
};

export const Archived: Story = {
  args: { archived: true },
};
