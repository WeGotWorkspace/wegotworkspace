import type { Meta, StoryObj } from "@storybook/react-vite";
import { Archive, Forward, Reply, Star } from "lucide-react";
import { ActionBar } from "../src/action-bar";
import { ToolbarButton } from "@/action-buttons/src/action-buttons";

const meta: Meta<typeof ActionBar> = {
  title: "Shared/Action Bar",
  component: ActionBar,
  decorators: [
    (Story) => (
      <div
        className="max-w-3xl border rounded-lg overflow-hidden"
        style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}
      >
        <Story />
        <div className="p-8 text-sm text-muted-foreground">Detail content below</div>
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ActionBar>;

export const MailLike: Story = {
  args: {
    onBack: () => {},
    left: (
      <>
        <ToolbarButton label="Reply" onClick={() => {}}>
          <Reply className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Forward" onClick={() => {}}>
          <Forward className="size-4" />
        </ToolbarButton>
      </>
    ),
    right: (
      <>
        <ToolbarButton label="Star" onClick={() => {}}>
          <Star className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Archive" onClick={() => {}}>
          <Archive className="size-4" />
        </ToolbarButton>
      </>
    ),
  },
};

export const NotesLike: Story = {
  args: {
    onBack: () => {},
    right: (
      <>
        <ToolbarButton label="Star" onClick={() => {}}>
          <Star className="size-4" />
        </ToolbarButton>
        <ToolbarButton label="Archive" onClick={() => {}}>
          <Archive className="size-4" />
        </ToolbarButton>
      </>
    ),
  },
};
