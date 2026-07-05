import { FilePreview } from "@/file-preview/src/file-preview";
import { PreviewLightbox } from "@/preview-lightbox/src/preview-lightbox";
import type { DriveFile } from "@/drive-core/src/drive-models";
import type { FilePreviewPayload } from "@/lib/file-preview/file-preview-types";

export type DrivePreviewLightboxProps = {
  open: boolean;
  file: DriveFile | null;
  preview?: FilePreviewPayload;
  previewableIds: readonly string[];
  onClose: () => void;
  onNavigate: (direction: -1 | 1) => void;
};

export function DrivePreviewLightbox({
  open,
  file,
  preview,
  previewableIds,
  onClose,
  onNavigate,
}: DrivePreviewLightboxProps) {
  if (!file) return null;

  const index = previewableIds.indexOf(file.id);
  const hasPrevious = index > 0;
  const hasNext = index >= 0 && index < previewableIds.length - 1;

  return (
    <PreviewLightbox
      open={open}
      title={file.title}
      onClose={onClose}
      hasPrevious={hasPrevious}
      hasNext={hasNext}
      onPrevious={() => onNavigate(-1)}
      onNext={() => onNavigate(1)}
    >
      <FilePreview
        fileKind={file.kind}
        fileName={file.title}
        preview={preview}
        variant="lightbox"
        textMode="scrollable"
        fallbackClassName="preview-lightbox__fallback opacity-60"
        videoControls
      />
    </PreviewLightbox>
  );
}
