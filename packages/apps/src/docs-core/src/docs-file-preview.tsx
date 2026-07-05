import { Component, type ErrorInfo, type ReactNode } from "react";
import { TextEditor } from "@/text-editor-core/src";
import { docsEditorFormatFromFileName } from "@/docs-core/src/docs-editor-format";
import { cn } from "@/lib/utils";
import "@/docs-core/src/docs-file-preview.css";

export type DocsFilePreviewVariant = "default" | "tile";

export type DocsFilePreviewProps = {
  fileName: string;
  fileApiPath?: string;
  content: string;
  className?: string;
  fallback?: ReactNode;
  variant?: DocsFilePreviewVariant;
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

function DocsFilePreviewEditor({
  fileName,
  fileApiPath,
  content,
  className,
  variant = "default",
}: DocsFilePreviewProps) {
  const format = docsEditorFormatFromFileName(fileName, fileApiPath);
  const isTile = variant === "tile";

  return (
    <div
      className={cn("docs-file-preview", isTile && "docs-file-preview--tile", className)}
      data-variant={variant}
    >
      <TextEditor
        key={`${fileName}:${content.length}`}
        format={format}
        content={content}
        editable={false}
        formatBar={false}
        sheetFill
        sheetVariant={format === "text" || isTile ? "inline" : "sheet"}
        className="docs-file-preview__editor"
      />
    </div>
  );
}

/** Read-only Docs editor surface for drive file previews (grid tiles / detail pane / lightbox). */
export function DocsFilePreview({
  fileName,
  fileApiPath,
  content,
  className,
  fallback = null,
  variant = "default",
}: DocsFilePreviewProps) {
  return (
    <DocsFilePreviewBoundary fallback={fallback}>
      <DocsFilePreviewEditor
        fileName={fileName}
        fileApiPath={fileApiPath}
        content={content}
        className={className}
        variant={variant}
      />
    </DocsFilePreviewBoundary>
  );
}
