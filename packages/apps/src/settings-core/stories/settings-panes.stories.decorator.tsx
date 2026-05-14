import type { ReactElement } from "react";
import "@/settings-core/src/settings-workspace.css";

export function settingsPaneDecorator(Story: () => ReactElement) {
  return (
    <div
      className="settings-workspace p-6 md:p-10"
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--color-cream, #f5f1e8)",
      }}
    >
      <div className="mx-auto max-w-2xl">
        <Story />
      </div>
    </div>
  );
}
