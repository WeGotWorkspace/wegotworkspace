import { useEffect, useState } from "react";
import type { FileKind } from "@/drive-core/src/drive-models";
import { canBrowserPreviewImage } from "@/drive-core/src/drive-file-utils";
import { kindIconLg } from "@/drive-core/src/drive-icons";
import type { FilePreviewPayload } from "@/lib/file-preview/file-preview-types";
import {
  FilePreviewTextPane,
  type FilePreviewTextPaneMode,
} from "@/file-preview/src/file-preview-text-pane";
import { cn } from "@/lib/utils";
import "@/file-preview/src/file-preview.css";

export type FilePreviewProps = {
  fileKind: FileKind;
  fileName: string;
  preview?: FilePreviewPayload;
  textMode?: FilePreviewTextPaneMode;
  mediaClassName?: string;
  fallbackClassName?: string;
  videoControls?: boolean;
};

export function FilePreview({
  fileKind,
  fileName,
  preview,
  textMode = "clamped",
  mediaClassName,
  fallbackClassName,
  videoControls = false,
}: FilePreviewProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [preview, fileName]);

  const supportsInlineImage = fileKind !== "image" || canBrowserPreviewImage(fileName);

  if (preview?.kind === "text" && preview.content.trim()) {
    return (
      <FilePreviewTextPane content={preview.content} mode={textMode} className={mediaClassName} />
    );
  }

  const blobUrl = preview?.kind === "blob-url" ? preview.url : undefined;
  const canPreviewMedia =
    (fileKind === "image" || fileKind === "video") &&
    Boolean(blobUrl) &&
    !failed &&
    supportsInlineImage;

  if (!canPreviewMedia) {
    return (
      <span className={cn("file-preview__fallback", fallbackClassName)} aria-hidden="true">
        {kindIconLg[fileKind]}
      </span>
    );
  }

  if (fileKind === "video") {
    return (
      <video
        src={blobUrl}
        className={mediaClassName}
        controls={videoControls}
        muted={!videoControls}
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <img
      src={blobUrl}
      alt={fileName}
      className={mediaClassName}
      onError={() => setFailed(true)}
      onLoad={(event) => {
        const img = event.currentTarget;
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          setFailed(true);
        }
      }}
    />
  );
}
