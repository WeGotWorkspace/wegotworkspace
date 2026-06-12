import type { ReactNode } from "react";
import "@/settings-core/src/settings-workspace.css";

export function SettingsStoryScope({ children }: { children: ReactNode }) {
  return (
    <div className="settings-workspace settings-story-scope">
      <div className="mx-auto max-w-2xl p-6 md:p-10">{children}</div>
    </div>
  );
}
