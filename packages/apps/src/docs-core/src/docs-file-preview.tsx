import { Component, type ErrorInfo, type ReactNode } from "react";
import { TextEditor } from "@/text-editor-core/src";
import { docsEditorFormatFromFileName } from "@/docs-core/src/docs-editor-format";
import { cn } from "@/lib/utils";
import "@/docs-core/src/docs-file-preview.css";

export type DocsFilePreviewProps = {
  fileName: string;
  content: string;
  className?: string;
  fallback?: ReactNode;
};

type DocsFilePreviewBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

type DocsFilePreviewBoundaryState = {
  hasError: boolean;
};

class DocsFilePreviewBoundary extends Component<
  DocsFilePreviewBoundaryProps,
  DocsFilePreviewBoundaryState
> {
  state: DocsFilePreviewBoundaryState = { hasError: false };

  static getDerivedStateFromError(): DocsFilePreviewBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    if (import.meta.env.DEV) {
      console.error("[DocsFilePreview]", error, info);
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

function DocsFilePreviewEditor({ fileName, content, className }: DocsFilePreviewProps) {
  const format = docsEditorFormatFromFileName(fileName);

  return (
    <div className={cn("docs-file-preview", className)}>
      <TextEditor
        key={`${fileName}:${content.length}`}
        format={format}
        content={content}
        editable={false}
        formatBar={false}
        sheetFill
        sheetVariant={format === "text" ? "inline" : "sheet"}
        className="docs-file-preview__editor"
      />
    </div>
  );
}

/** Read-only Docs editor surface for drive file previews (detail pane / lightbox). */
export function DocsFilePreview({
  fileName,
  content,
  className,
  fallback = null,
}: DocsFilePreviewProps) {
  if (!content.trim()) return fallback;

  return (
    <DocsFilePreviewBoundary fallback={fallback}>
      <DocsFilePreviewEditor fileName={fileName} content={content} className={className} />
    </DocsFilePreviewBoundary>
  );
}
