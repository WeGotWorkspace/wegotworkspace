import type { ReactNode } from "react";
import "@/settings-core/src/settings-workspace.css";

export function SettingsStoryScope({ children }: { children: ReactNode }) {
  return (
    <div
      className="settings-workspace p-6 md:p-10"
      style={{
        minHeight: "100dvh",
        backgroundColor: "var(--color-cream, #ffffff)",
      }}
    >
      <div className="mx-auto max-w-2xl">{children}</div>
    </div>
  );
}
