import type { DriveFile } from "@/drive-core/src/drive-models";
import { FilePreview } from "@/file-preview/src/file-preview";
import type { FilePreviewPayload } from "@/lib/file-preview/file-preview-types";

type DriveMediaPreviewProps = {
  file: DriveFile;
  preview?: FilePreviewPayload;
  /** @deprecated Use `preview` with `{ kind: "blob-url", url }` instead. */
  previewSrc?: string;
  textMode?: "clamped" | "scrollable";
  mediaClassName?: string;
  fallbackClassName?: string;
  videoControls?: boolean;
};

/** @deprecated Prefer `FilePreview` directly. Kept for existing Drive imports. */
export function DriveMediaPreview({
  file,
  preview,
  previewSrc,
  textMode,
  mediaClassName,
  fallbackClassName,
  videoControls = false,
}: DriveMediaPreviewProps) {
  const resolvedPreview =
    preview ?? (previewSrc ? { kind: "blob-url" as const, url: previewSrc } : undefined);

  return (
    <FilePreview
      fileKind={file.kind}
      fileName={file.title}
      preview={resolvedPreview}
      textMode={textMode}
      mediaClassName={mediaClassName}
      fallbackClassName={fallbackClassName}
      videoControls={videoControls}
    />
  );
}

export { FilePreview };
