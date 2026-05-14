import type { Meta, StoryObj } from "@storybook/react-vite";
import { PenSquare, Trash2 } from "lucide-react";
import { IconButton } from "@/app-button/src/button";
import { LIST_ICON_BUTTON_STYLE } from "@/app-button/src/icon-button-presets";
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
        <IconButton
          label="Compose"
          onClick={() => {}}
          icon={<PenSquare className="size-4" />}
          size="sm"
          variant="subtle"
          style={LIST_ICON_BUTTON_STYLE}
        />
        <IconButton
          label="Delete"
          onClick={() => {}}
          icon={<Trash2 className="size-4" />}
          size="sm"
          variant="subtle"
          style={LIST_ICON_BUTTON_STYLE}
        />
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
