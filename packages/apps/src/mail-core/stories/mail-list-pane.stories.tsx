import type { Meta, StoryObj } from "@storybook/react-vite";
import { CollectionListWorkspace } from "@/collection-layout/src/collection-layout";
import { MailListPanel } from "@/mail-core/src/mail-list-panel";
import { mailListColumnDecorator } from "./mail-panes.stories.decorator";
import { useMailPaneStoryController } from "./mail-pane-stories.harness";

const storyChrome = {
  sidebarOpen: true,
  toggleSidebar: () => {},
} as const;

export type MailListPanePreset = "default" | "empty" | "loading";

function MailListPaneHarness({ preset = "default" }: { preset?: MailListPanePreset }) {
  const controller = useMailPaneStoryController(
    preset === "empty"
      ? { mailOverride: [] }
      : preset === "loading"
        ? { listLoading: true }
        : undefined,
  );

  const listProps = MailListPanel({
    L: controller.L,
    sidebarOpen: storyChrome.sidebarOpen,
    onToggleSidebar: storyChrome.toggleSidebar,
    viewLabel: controller.viewLabel,
    selectedIds: controller.selectedIds,
    selectionMode: controller.selectionMode || controller.selectedIds.length > 1,
    effectiveListLoading: controller.effectiveListLoading,
    visibleMail: controller.visibleMail,
    searchQuery: controller.searchQuery,
    setSearchQuery: controller.setSearchQuery,
    searchInputRef: controller.searchInputRef,
    inTrash: controller.inTrash,
    isTouch: controller.isTouch,
    starred: controller.starred,
    activeId: controller.activeId,
    isItemDragging: controller.isItemDragging,
    handleSelect: controller.handleSelect,
    handleDoubleClick: controller.handleMailItemDoubleClick,
    enterSelectionFor: controller.enterSelectionFor,
    itemDragHandlers: controller.itemDragHandlers,
    toggleStar: controller.toggleStar,
    moveOne: controller.moveOne,
    listEndRef: controller.listEndRef,
    isLoadingMore: controller.isLoadingMore,
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
  title: "Apps/Mail/Panes/List",
  component: MailListPaneHarness,
  decorators: [mailListColumnDecorator],
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    preset: {
      control: "select",
      options: ["default", "empty", "loading"],
    },
  },
} satisfies Meta<typeof MailListPaneHarness>;

export default meta;
type Story = StoryObj<typeof MailListPaneHarness>;

export const Default: Story = {
  args: { preset: "default" },
};

export const Empty: Story = {
  args: { preset: "empty" },
};

export const Loading: Story = {
  args: { preset: "loading" },
};
