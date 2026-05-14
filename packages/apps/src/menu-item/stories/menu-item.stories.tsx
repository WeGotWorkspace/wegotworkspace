import type { Meta, StoryObj } from "@storybook/react-vite";
import { Folder, Star } from "lucide-react";
import { MenuItem } from "../src/menu-item";

const meta: Meta<typeof MenuItem> = {
  title: "Shared/Menu Item",
  component: MenuItem,
  decorators: [
    (Story) => (
      <section
        className="sidebar-section w-72 rounded-lg border p-3"
        style={{
          backgroundColor: "var(--color-paper)",
          borderColor: "color-mix(in oklab, var(--color-ink) 12%, transparent)",
        }}
      >
        <ul className="sidebar-section__list">
          <li>
            <Story />
          </li>
        </ul>
      </section>
    ),
  ],
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

export const WithDescription: Story = {
  args: {
    label: "Disk space",
    description: "42.1 GB free of 100 GB",
    icon: <Folder className="size-4" />,
  },
};
