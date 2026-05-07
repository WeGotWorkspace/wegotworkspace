import type { CSSProperties } from "react";
import { Mail, NotebookPen } from "lucide-react";
import { AppSwitcher } from "@/app-switcher/src/app-switcher";

export type StorybookAppSwitcherWorkspace = "mail" | "notes";

const MAIL_MENU_STYLE: CSSProperties = {
  backgroundColor: "oklch(0.858745 0.15558 94.085)",
  color: "var(--color-ink)",
  borderColor: "color-mix(in oklab, currentColor 25%, transparent)",
};

const NOTES_MENU_STYLE: CSSProperties = {
  backgroundColor: "var(--color-paper)",
  color: "var(--color-ink)",
  borderColor: "color-mix(in oklab, currentColor 25%, transparent)",
};

type StorybookAppSwitcherMockProps = {
  /** Which workspace the trigger title and menu chrome should reflect. */
  workspace?: StorybookAppSwitcherWorkspace;
};

/** Presentational app switcher for Storybook (no router). */
export function StorybookAppSwitcherMock({ workspace = "mail" }: StorybookAppSwitcherMockProps) {
  const subtitle = workspace === "mail" ? "Mail" : "Notes";
  const menuContentStyle = workspace === "mail" ? MAIL_MENU_STYLE : NOTES_MENU_STYLE;

  return (
    <AppSwitcher
      tagline="We got"
      subtitle={subtitle}
      items={[
        {
          id: "notes",
          label: "Notes",
          icon: <NotebookPen className="size-4" />,
          checked: workspace === "notes",
          onSelect: () => {},
        },
        {
          id: "mail",
          label: "Mail",
          icon: <Mail className="size-4" />,
          checked: workspace === "mail",
          onSelect: () => {},
        },
      ]}
      menuContentClassName="min-w-[12rem] p-1.5"
      menuContentStyle={menuContentStyle}
    />
  );
}
