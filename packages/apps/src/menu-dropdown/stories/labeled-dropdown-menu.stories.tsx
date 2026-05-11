import type { CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Mail, NotebookPen } from "lucide-react";
import { LabeledDropdownMenu } from "../src/labeled-dropdown-menu";

const meta: Meta<typeof LabeledDropdownMenu> = {
  title: "Shared/Labeled Dropdown Menu",
  component: LabeledDropdownMenu,
};

export default meta;
type Story = StoryObj<typeof LabeledDropdownMenu>;

const mailMenuStyle = {
  backgroundColor: "oklch(0.858745 0.15558 94.085)",
  color: "var(--color-ink)",
  borderColor: "color-mix(in oklab, currentColor 25%, transparent)",
} satisfies CSSProperties;

export const WorkspaceApps: Story = {
  args: {
    labelTop: "We got",
    labelBottom: "Apps",
    items: [
      {
        id: "notes",
        label: "Notes",
        icon: <NotebookPen className="size-4" />,
        onClick: () => {},
      },
      {
        id: "mail",
        label: "Mail",
        icon: <Mail className="size-4" />,
        checked: true,
        onClick: () => {},
      },
    ],
    contentClassName: "min-w-[12rem] p-1.5",
    contentStyle: mailMenuStyle,
  },
};
