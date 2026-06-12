import type { ReactNode } from "react";
import "@/admin-core/src/admin-workspace.css";

export function AdminStoryScope({ children }: { children: ReactNode }) {
  return (
    <div className="admin-workspace admin-story-scope">
      <div className="mx-auto max-w-2xl p-6 md:p-10">{children}</div>
    </div>
  );
}
