import type { ReactNode } from "react";

import "@/markdown-editor-core/src/markdown-editor.css";

export function MarkdownEditorStoryScope({ children }: { children: ReactNode }) {
  return (
    <div className="markdown-editor h-[min(900px,90dvh)] w-full overflow-hidden rounded-lg border border-border">
      {children}
    </div>
  );
}
