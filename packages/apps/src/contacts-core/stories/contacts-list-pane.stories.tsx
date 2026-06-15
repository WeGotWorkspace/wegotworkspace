import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { CollectionListWorkspace } from "@/collection-layout/src/collection-layout";
import { ContactsListPanel } from "@/contacts-core/src/contacts-list-panel";
import { useContactsPaneStoryController } from "./contacts-pane-stories.harness";
import { ContactsStoryScope } from "./contacts-story-scope";

const storyChrome = {
  sidebarOpen: true,
  toggleSidebar: () => {},
} as const;

export type ContactsListPanePreset = "default" | "empty" | "loading";

function ContactsListPaneHarness({ preset = "default" }: { preset?: ContactsListPanePreset }) {
  const controller = useContactsPaneStoryController(
    preset === "empty"
      ? { cardsOverride: [] }
      : preset === "loading"
        ? { listLoading: true }
        : undefined,
  );

  const listProps = ContactsListPanel({
    L: controller.L,
    sidebarOpen: storyChrome.sidebarOpen,
    onToggleSidebar: storyChrome.toggleSidebar,
    viewLabel: controller.viewLabel,
    selectedIds: controller.selectedIds,
    selectionMode: controller.selectionMode || controller.selectedIds.length > 1,
    listLoading: controller.listLoading,
    visibleCards: controller.visibleCards,
    searchQuery: controller.searchQuery,
    setSearchQuery: controller.setSearchQuery,
    searchInputRef: controller.searchInputRef,
    canCreateContact: controller.canCreateContact,
    isTouch: controller.isTouch,
    activeId: controller.activeId,
    isItemDragging: controller.isItemDragging,
    handleSelect: controller.handleSelect,
    enterSelectionFor: controller.enterSelectionFor,
    itemDragHandlers: controller.itemDragHandlers,
    createContact: controller.createContact,
    selectionBar: controller.selectionBar,
  });

  return (
    <ContactsStoryScope variant="list-column">
      <CollectionListWorkspace detailOpenMobile={false} {...listProps} />
      {controller.confirmDialog}
    </ContactsStoryScope>
  );
}

const meta = {
  title: "Apps/Contacts/Panes/List",
  component: ContactsListPaneHarness,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    preset: {
      control: "select",
      options: ["default", "empty", "loading"],
    },
  },
} satisfies Meta<typeof ContactsListPaneHarness>;

export default meta;
type Story = StoryObj<typeof ContactsListPaneHarness>;

export const Default: Story = {
  tags: ["vitest-ci"],
  args: { preset: "default" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("heading", { level: 3, name: "Jane Doe" })).toBeInTheDocument();
    await expect(canvas.getByRole("heading", { level: 3, name: "Acme Corp" })).toBeInTheDocument();
    await expect(canvas.getByText("info@acme.com")).toBeInTheDocument();
    const input = canvas.getByPlaceholderText("Search contacts...");
    await userEvent.type(input, "joe@");
    await expect(input).toHaveValue("joe@");
  },
};

export const Empty: Story = {
  args: { preset: "empty" },
};

export const Loading: Story = {
  args: { preset: "loading" },
};
