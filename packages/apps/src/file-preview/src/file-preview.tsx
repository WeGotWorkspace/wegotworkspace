import { useEffect, useState, type ReactNode } from "react";
import type { FileKind } from "@/drive-core/src/drive-models";
import { canBrowserPreviewImage } from "@/drive-core/src/drive-file-utils";
import { kindIconLg } from "@/drive-core/src/drive-icons";
import { DocsFilePreview } from "@/docs-core/src/docs-file-preview";
import type { FilePreviewPayload } from "@/lib/file-preview/file-preview-types";
import {
  blobPreviewAspectRatio,
  lightboxFallbackAspectRatio,
  mediaAspectRatio,
  stripPreviewText,
} from "@/lib/file-preview/file-preview-utils";
import {
  FilePreviewTextPane,
  type FilePreviewTextPaneMode,
} from "@/file-preview/src/file-preview-text-pane";
import { cn } from "@/lib/utils";
import "@/file-preview/src/file-preview.css";

export type FilePreviewVariant = "tile" | "lightbox" | "detail";

export type FilePreviewProps = {
  fileKind: FileKind;
  fileName: string;
  fileApiPath?: string;
  preview?: FilePreviewPayload;
  variant?: FilePreviewVariant;
  textMode?: FilePreviewTextPaneMode;
  mediaClassName?: string;
  fallbackClassName?: string;
  videoControls?: boolean;
};

function LightboxMediaFrame({
  aspectRatio,
  className,
  children,
}: {
  aspectRatio: number;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn("file-preview__lightbox-frame", className)}
      style={{ aspectRatio }}
      data-testid="file-preview-lightbox-frame"
    >
      {children}
    </div>
  );
}

export function FilePreview({
  fileKind,
  fileName,
  fileApiPath,
  preview,
  variant = "tile",
  textMode = "clamped",
  mediaClassName,
  fallbackClassName,
  videoControls = false,
}: FilePreviewProps) {
  const [failed, setFailed] = useState(false);
  const [resolvedAspectRatio, setResolvedAspectRatio] = useState<number | null>(() =>
    variant === "lightbox" ? blobPreviewAspectRatio(preview, fileKind) : null,
  );

  useEffect(() => {
    setFailed(false);
    setResolvedAspectRatio(
      variant === "lightbox" ? blobPreviewAspectRatio(preview, fileKind) : null,
    );
  }, [fileKind, preview, fileName, variant]);

  const supportsInlineImage = fileKind !== "image" || canBrowserPreviewImage(fileName);

  if (preview?.kind === "docs") {
    const fallbackText = stripPreviewText(preview.content, fileName);
    return (
      <DocsFilePreview
        fileName={fileName}
        fileApiPath={fileApiPath}
        content={preview.content}
        className={mediaClassName}
        fallback={
          fallbackText ? (
            <FilePreviewTextPane
              content={fallbackText}
              mode={textMode}
              className={mediaClassName}
            />
          ) : (
            <span className={cn("file-preview__fallback", fallbackClassName)} aria-hidden="true">
              {kindIconLg[fileKind]}
            </span>
          )
        }
      />
    );
  }

  if (preview?.kind === "text" && preview.content.trim()) {
    return (
      <FilePreviewTextPane content={preview.content} mode={textMode} className={mediaClassName} />
    );
  }

  const blobPreview = preview?.kind === "blob-url" ? preview : undefined;
  const blobUrl = blobPreview?.url;
  const canPreviewMedia =
    (fileKind === "image" || fileKind === "video") &&
    Boolean(blobUrl) &&
    !failed &&
    supportsInlineImage;

  const reserveLightboxSpace =
    variant === "lightbox" && (fileKind === "image" || fileKind === "video");
  const lightboxAspectRatio =
    resolvedAspectRatio ?? (reserveLightboxSpace ? lightboxFallbackAspectRatio(fileKind) : null);

  const updateAspectRatio = (width: number, height: number) => {
    const next = mediaAspectRatio(width, height);
    if (next == null) return;
    setResolvedAspectRatio((current) => (current === next ? current : next));
  };

  const wrapLightboxMedia = (node: ReactNode) => {
    if (!reserveLightboxSpace || lightboxAspectRatio == null) return node;
    return (
      <LightboxMediaFrame aspectRatio={lightboxAspectRatio} className={mediaClassName}>
        {node}
      </LightboxMediaFrame>
    );
  };

  if (!canPreviewMedia) {
    if (reserveLightboxSpace && lightboxAspectRatio != null) {
      return (
        <LightboxMediaFrame aspectRatio={lightboxAspectRatio} className={mediaClassName}>
          <span className={cn("file-preview__fallback", fallbackClassName)} aria-hidden="true">
            {kindIconLg[fileKind]}
          </span>
        </LightboxMediaFrame>
      );
    }
    return (
      <span className={cn("file-preview__fallback", fallbackClassName)} aria-hidden="true">
        {kindIconLg[fileKind]}
      </span>
    );
  }

  const mediaClassNameResolved = cn(
    reserveLightboxSpace ? "file-preview__lightbox-media" : mediaClassName,
  );

  if (fileKind === "video") {
    return wrapLightboxMedia(
      <video
        src={blobUrl}
        className={mediaClassNameResolved}
        controls={videoControls}
        muted={!videoControls}
        playsInline
        preload="metadata"
        onError={() => setFailed(true)}
        onLoadedMetadata={(event) => {
          const video = event.currentTarget;
          updateAspectRatio(video.videoWidth, video.videoHeight);
        }}
      />,
    );
  }

  return wrapLightboxMedia(
    <img
      src={blobUrl}
      alt={fileName}
      className={mediaClassNameResolved}
      width={blobPreview?.width}
      height={blobPreview?.height}
      onError={() => setFailed(true)}
      onLoad={(event) => {
        const img = event.currentTarget;
        if (img.naturalWidth === 0 || img.naturalHeight === 0) {
          setFailed(true);
          return;
        }
        updateAspectRatio(img.naturalWidth, img.naturalHeight);
      }}
    />,
  );
}
