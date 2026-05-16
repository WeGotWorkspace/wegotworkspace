import type { Meta, StoryObj } from "@storybook/react-vite";
import { PenSquare, Trash2 } from "lucide-react";
import { IconButton } from "@/button/src/button";
import { ViewHeader } from "@/view-header/src/view-header";
import "./view-header.stories.css";

const meta: Meta<typeof ViewHeader> = {
  title: "Shared/View Header",
  component: ViewHeader,
};

export default meta;
type Story = StoryObj<typeof ViewHeader>;

export const Default: Story = {
  args: {
    title: "All Items",
    subtitle: "24 Files",
    sidebarOpen: true,
    onToggleSidebar: () => {},
    actions: (
      <div className="view-header-story-actions flex items-center gap-2">
        <IconButton
          label="Compose"
          onClick={() => {}}
          icon={<PenSquare />}
          size="sm"
          variant="subtle"
        />
        <IconButton
          label="Delete"
          onClick={() => {}}
          icon={<Trash2 />}
          size="sm"
          variant="subtle"
        />
      </div>
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

/** Portaled surfaces (e.g. mail compose dialog) omit the sidebar toggle. */
export const WithoutSidebarToggle: Story = {
  args: {
    title: "New message",
    subtitle: "Drafts · Today 14:32",
    hideSidebarToggle: true,
  },
};
