import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { CollectionListWorkspace } from "@/collection-layout/src/collection-layout";
import { NotesListPanel } from "@/notes-core/src/notes-list-panel";
import { notesListColumnDecorator } from "./notes-panes.stories.decorator";
import { useNotesPaneStoryController } from "./notes-pane-stories.harness";

const storyChrome = {
  sidebarOpen: true,
  toggleSidebar: () => {},
} as const;

export type NotesListPanePreset = "default" | "empty" | "loading" | "inNotebook";

export function NotesListPaneHarness({ preset = "default" }: { preset?: NotesListPanePreset }) {
  const controller = useNotesPaneStoryController(
    preset === "empty"
      ? { notesOverride: [] }
      : preset === "loading"
        ? { listLoading: true }
        : undefined,
  );

  const firstNotebook = controller.notes[0]?.notebook ?? "";

  useEffect(() => {
    if (preset === "inNotebook" && firstNotebook) {
      controller.selectView(`nb:${firstNotebook}`);
    }
    // Storybook: apply notebook filter when preset/seed change, not on every controller churn.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentional
  }, [preset, firstNotebook]);

  const listProps = NotesListPanel({
    L: controller.L,
    sidebarOpen: storyChrome.sidebarOpen,
    onToggleSidebar: storyChrome.toggleSidebar,
    viewLabel: controller.viewLabel,
    selectedIds: controller.selectedIds,
    selectionMode: controller.selectionMode || controller.selectedIds.length > 1,
    listLoading: controller.listLoading,
    visibleNotes: controller.visibleNotes,
    searchQuery: controller.searchQuery,
    setSearchQuery: controller.setSearchQuery,
    searchInputRef: controller.searchInputRef,
    canEditDelete: controller.canEditDelete,
    selectedNotebook: controller.selectedNotebook,
    selectedTag: controller.selectedTag,
    view: controller.view,
    isTouch: controller.isTouch,
    starred: controller.starred,
    archived: controller.archived,
    activeId: controller.activeId,
    isItemDragging: controller.isItemDragging,
    handleSelect: controller.handleSelect,
    enterSelectionFor: controller.enterSelectionFor,
    itemDragHandlers: controller.itemDragHandlers,
    openEditDialog: controller.setEditDialog,
    openDeleteDialog: controller.setDeleteDialog,
    openDeleteConfirmForArchive: controller.openDeleteConfirm,
    toggleStar: controller.toggleStar,
    toggleArchive: controller.toggleArchive,
    selectionBar: controller.selectionBar,
  });

  return (
    <>
      <CollectionListWorkspace detailOpenMobile={false} {...listProps} />
      {controller.confirmDialog}
    </>
  );
}

const meta = {
  title: "Apps/Notes/Panes/List",
  component: NotesListPaneHarness,
  decorators: [notesListColumnDecorator],
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    preset: {
      control: "select",
      options: ["default", "empty", "loading", "inNotebook"],
    },
  },
} satisfies Meta<typeof NotesListPaneHarness>;

export default meta;
type Story = StoryObj<typeof NotesListPaneHarness>;

export const Default: Story = {
  args: { preset: "default" },
};

export const Empty: Story = {
  args: { preset: "empty" },
};

export const Loading: Story = {
  args: { preset: "loading" },
};

export const ActiveNotebook: Story = {
  args: { preset: "inNotebook" },
};
