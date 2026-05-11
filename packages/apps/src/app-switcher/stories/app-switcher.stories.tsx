import type { ComponentType, CSSProperties } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { Mail, NotebookPen } from "lucide-react";
import { AppSwitcher } from "../src/app-switcher";

const meta: Meta<typeof AppSwitcher> = {
  title: "Shared/App Switcher",
  component: AppSwitcher,
};

export default meta;
type Story = StoryObj<typeof AppSwitcher>;

const mailMenuStyle = {
  backgroundColor: "oklch(0.858745 0.15558 94.085)",
  color: "var(--color-ink)",
  borderColor: "color-mix(in oklab, currentColor 25%, transparent)",
} satisfies CSSProperties;

const notesMenuStyle = {
  backgroundColor: "var(--color-paper)",
  color: "var(--color-ink)",
  borderColor: "color-mix(in oklab, currentColor 25%, transparent)",
} satisfies CSSProperties;

export const StableSubtitleApps: Story = {
  name: "Subtitle: Apps (production-style)",
  args: {
    tagline: "We got",
    subtitle: "Apps",
    items: [
      {
        id: "notes",
        label: "Notes",
        icon: <NotebookPen className="size-4" />,
        onSelect: () => {},
      },
      {
        id: "mail",
        label: "Mail",
        icon: <Mail className="size-4" />,
        checked: true,
        onSelect: () => {},
      },
    ],
    menuContentClassName: "min-w-[12rem] p-1.5",
    menuContentStyle: mailMenuStyle,
  },
};

export const MailWorkspace: Story = {
  name: "Subtitle: Mail",
  args: {
    tagline: "We got",
    subtitle: "Mail",
    items: [
      {
        id: "notes",
        label: "Notes",
        icon: <NotebookPen className="size-4" />,
        onSelect: () => {},
      },
      {
        id: "mail",
        label: "Mail",
        icon: <Mail className="size-4" />,
        checked: true,
        onSelect: () => {},
      },
    ],
    menuContentClassName: "min-w-[12rem] p-1.5",
    menuContentStyle: mailMenuStyle,
  },
};

export const NotesWorkspace: Story = {
  name: "Subtitle: Notes",
  args: {
    tagline: "We got",
    subtitle: "Notes",
    items: [
      {
        id: "notes",
        label: "Notes",
        icon: <NotebookPen className="size-4" />,
        checked: true,
        onSelect: () => {},
      },
      {
        id: "mail",
        label: "Mail",
        icon: <Mail className="size-4" />,
        onSelect: () => {},
      },
    ],
    menuContentClassName: "min-w-[12rem] p-1.5",
    menuContentStyle: notesMenuStyle,
  },
  decorators: [
    (Story: ComponentType) => (
      <div className="min-h-[200px] p-6" style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}>
        <Story />
      </div>
    ),
  ],
};
