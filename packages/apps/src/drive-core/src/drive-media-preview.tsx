import { useEffect, useState } from "react";
import type { DriveFile } from "@/drive-core/src/drive-models";
import { canBrowserPreviewImage } from "@/drive-core/src/drive-file-utils";
import { kindIconLg } from "@/drive-core/src/drive-icons";
import { cn } from "@/lib/utils";

type DriveMediaPreviewProps = {
  file: DriveFile;
  previewSrc?: string;
  mediaClassName?: string;
  fallbackClassName?: string;
  videoControls?: boolean;
};

export function DriveMediaPreview({
  file,
  previewSrc,
  mediaClassName,
  fallbackClassName,
  videoControls = false,
}: DriveMediaPreviewProps) {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [previewSrc, file.id]);

  const supportsInlineImage =
    file.kind !== "image" || canBrowserPreviewImage(file.title);

  const canPreview =
    (file.kind === "image" || file.kind === "video") &&
    Boolean(previewSrc) &&
    !failed &&
    supportsInlineImage;

  if (!canPreview) {
    return (
      <span className={cn("drive-media-preview__fallback", fallbackClassName)} aria-hidden="true">
        {kindIconLg[file.kind]}
      </span>
    );
  }

  if (file.kind === "video") {
    return (
      <video
        src={previewSrc}
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
      src={previewSrc}
      alt={file.title}
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
