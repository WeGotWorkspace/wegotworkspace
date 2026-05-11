import type { ComponentType } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Folder, Star } from "lucide-react";
import { MenuItem } from "../src/menu-item";

const meta: Meta<typeof MenuItem> = {
  title: "Shared/Menu Item",
  component: MenuItem,
};

export default meta;
type Story = StoryObj<typeof MenuItem>;

export const Default: Story = {
  args: {
    label: "Inbox",
    icon: <Folder className="size-3.5" />,
    onClick: () => {},
    selected: false,
  },
};

export const SelectedWithBadge: Story = {
  args: {
    label: "Starred",
    icon: <Star className="size-3.5" />,
    badge: 7,
    onClick: () => {},
    selected: true,
  },
};

export const CheckedInheritTone: Story = {
  args: {
    label: "Notes",
    icon: <Folder className="size-4" />,
    checked: true,
    tone: "inherit",
    className: "gap-2.5 px-2.5 py-2 rounded-md",
    onClick: () => {},
  },
  decorators: [
    (Story: ComponentType) => (
      <div
        className="p-4 rounded-md border max-w-xs"
        style={{
          backgroundColor: "var(--color-paper)",
          color: "var(--color-ink)",
        }}
      >
        <Story />
      </div>
    ),
  ],
};

export const WithDescription: Story = {
  args: {
    label: "Disk space",
    description: "42.1 GB free of 100 GB",
    icon: <Folder className="size-4" />,
    tone: "inherit",
  },
  decorators: [
    (Story: ComponentType) => (
      <div
        className="p-4 rounded-md border max-w-xs"
        style={{
          backgroundColor: "var(--color-paper)",
          color: "var(--color-ink)",
        }}
      >
        <Story />
      </div>
    ),
  ],
};
