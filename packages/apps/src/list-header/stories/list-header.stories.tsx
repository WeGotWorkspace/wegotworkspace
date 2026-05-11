import type { Meta, StoryObj } from "@storybook/react-vite";
import { PenSquare, Trash2 } from "lucide-react";
import { ListAction } from "@/action-buttons/src/action-buttons";
import { ListHeader } from "@/list-header/src/list-header";

const meta: Meta<typeof ListHeader> = {
  title: "Shared/List Header",
  component: ListHeader,
};

export default meta;
type Story = StoryObj<typeof ListHeader>;

export const Default: Story = {
  args: {
    title: "All Items",
    subtitle: "24 Files",
    sidebarOpen: true,
    onToggleSidebar: () => {},
    actions: (
      <>
        <ListAction label="Compose" onClick={() => {}}>
          <PenSquare className="size-4" />
        </ListAction>
        <ListAction label="Delete" onClick={() => {}}>
          <Trash2 className="size-4" />
        </ListAction>
      </>
    ),
    searchPlaceholder: "Search notes...",
    onSearchInput: () => {},
  },
};

export const WithoutSearch: Story = {
  args: {
    ...Default.args,
    searchPlaceholder: undefined,
  },
};
