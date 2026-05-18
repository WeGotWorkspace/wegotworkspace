import type { Meta, StoryObj } from "@storybook/react-vite";
import { Cloud } from "lucide-react";
import { CollectionEmptyState } from "@/collection-empty-state/src/collection-empty-state";

const meta = {
  title: "Shared/CollectionEmptyState",
  component: CollectionEmptyState,
  tags: ["autodocs"],
} satisfies Meta<typeof CollectionEmptyState>;

export default meta;
type Story = StoryObj<typeof CollectionEmptyState>;

export const EmptyFolder: Story = {
  name: "Empty folder",
  args: {
    icon: <Cloud className="size-12" />,
    children: "This folder is empty",
  },
};
