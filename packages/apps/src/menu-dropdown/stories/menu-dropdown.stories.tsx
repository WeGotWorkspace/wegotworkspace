import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Archive, Mail, NotebookPen, Star } from "lucide-react";
import { Button } from "@/button/src/button";
import { MenuDropdown } from "../src/menu-dropdown";
import type { MenuDropdownItemProps } from "../src/menu-dropdown";

const meta: Meta<typeof MenuDropdown> = {
  title: "Shared/Menu Dropdown",
  component: MenuDropdown,
};

export default meta;
type Story = StoryObj<typeof MenuDropdown>;

const baseItems: MenuDropdownItemProps[] = [
  { id: "notes", label: "Notes", icon: <NotebookPen className="size-4" />, onClick: () => {} },
  { id: "mail", label: "Mail", icon: <Mail className="size-4" />, onClick: () => {} },
  { id: "archive", label: "Archive", icon: <Archive className="size-4" />, onClick: () => {} },
];

const warmPanelStyle = {
  backgroundColor: "oklch(0.858745 0.15558 94.085)",
  color: "var(--color-ink)",
  borderColor: "color-mix(in oklab, currentColor 25%, transparent)",
} satisfies CSSProperties;

export const Default: Story = {
  args: {
    trigger: <Button label="Open menu" variant="subtle" />,
    items: baseItems,
    align: "start",
    contentClassName: "min-w-[12rem] p-1.5",
  },
};

export const CheckedState: Story = {
  args: {
    ...Default.args,
    items: [
      { id: "notes", label: "Notes", icon: <NotebookPen className="size-4" />, onClick: () => {} },
      {
        id: "mail",
        label: "Mail",
        icon: <Mail className="size-4" />,
        checked: true,
        onClick: () => {},
      },
      { id: "starred", label: "Starred", icon: <Star className="size-4" />, onClick: () => {} },
    ],
    align: "end",
    contentStyle: warmPanelStyle,
  },
};

export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true,
    trigger: <Button label="Menu disabled" variant="subtle" disabled />,
  },
};
