import { cn } from "@/lib/utils";
import "@/file-preview/src/file-preview-text-pane.css";

export type FilePreviewTextPaneMode = "clamped" | "scrollable";

export type FilePreviewTextPaneProps = {
  content: string;
  mode?: FilePreviewTextPaneMode;
  className?: string;
};

export function FilePreviewTextPane({
  content,
  mode = "clamped",
  className,
}: FilePreviewTextPaneProps) {
  if (!content.trim()) return null;

  return (
    <div
      className={cn(
        "file-preview-text-pane",
        mode === "clamped" && "file-preview-text-pane--clamped",
        mode === "scrollable" && "file-preview-text-pane--scrollable",
        className,
      )}
    >
      <div className="file-preview-text-pane__sheet" aria-hidden="true" />
      <p className="file-preview-text-pane__content">{content}</p>
    </div>
  );
}
