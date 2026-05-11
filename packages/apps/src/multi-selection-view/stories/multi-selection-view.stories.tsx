import type { Meta, StoryObj } from "@storybook/react-vite";
import { CheckSquare2, FolderInput, Star, Trash2 } from "lucide-react";
import { MultiSelectionView } from "../src/multi-selection-view";

const meta: Meta<typeof MultiSelectionView> = {
  title: "Shared/Multi Selection View",
  component: MultiSelectionView,
  decorators: [
    (Story) => (
      <div
        className="mx-auto max-w-3xl rounded-lg border p-8"
        style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MultiSelectionView>;

export const Default: Story = {
  args: {
    count: 3,
    actions: [
      { id: "move", label: "Move", icon: <FolderInput className="size-4" /> },
      { id: "star", label: "Star", icon: <Star className="size-4" /> },
      { id: "trash", label: "Delete", icon: <Trash2 className="size-4" /> },
    ],
  },
};

export const CustomCopyAndIcon: Story = {
  args: {
    count: 12,
    label: "Batch mode",
    title: (count) => `${count} records selected`,
    icon: <CheckSquare2 className="size-9" strokeWidth={1.5} />,
    actions: [{ id: "archive", label: "Archive", icon: <FolderInput className="size-4" /> }],
  },
};
