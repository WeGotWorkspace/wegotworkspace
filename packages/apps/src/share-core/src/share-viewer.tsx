import { useRef } from "react";
import { Cloud, Download, Folder, Upload } from "lucide-react";
import { Button, IconButton } from "@/button/src/button";
import { CollectionState } from "@/collection-state/src/collection-state";
import { PathBreadcrumb } from "@/path-breadcrumb/src/path-breadcrumb";
import { UploadProgress } from "@/upload-progress/src/upload-progress";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { DriveMediaPreview } from "@/drive-core/src/drive-media-preview";
import { kindIconLg } from "@/drive-core/src/drive-icons";
import type { DriveFile } from "@/drive-core/src/drive-models";
import { useShareViewer } from "@/share-core/src/use-share-viewer";
import { shareLabels } from "@/share-core/src/share-labels";
import { ShareFrame } from "@/share-core/src/share-frame";
import type { DriveAPIOperations } from "@/drive-core/src/drive-types";
import type { WgwSharePublicMeta } from "@/lib/api/wgw/shares-types";
import "@/share-core/src/share-core.css";

export type ShareViewerProps = {
  meta: WgwSharePublicMeta;
  operations: DriveAPIOperations;
};

export function ShareViewer({ meta, operations }: ShareViewerProps) {
  const viewer = useShareViewer({ meta, operations });
  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  const subtitle = viewer.canWrite ? undefined : shareLabels.readOnlyNote;

  const actions = (
    <>
      {viewer.canWrite ? (
        <Button
          variant="outline"
          icon={<Upload />}
          label={shareLabels.uploadFiles}
          onClick={() => uploadInputRef.current?.click()}
        />
      ) : null}
      {!viewer.isDirectory && viewer.singleFile ? (
        <Button
          variant="primary"
          icon={<Download />}
          label={shareLabels.download}
          onClick={() => viewer.download(viewer.singleFile!)}
        />
      ) : null}
    </>
  );

  return (
    <ShareFrame title={meta.name} subtitle={subtitle} actions={actions}>
      <input
        ref={uploadInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(event) => {
          viewer.uploadFiles(event.target.files);
          event.target.value = "";
        }}
      />

      {viewer.isDirectory ? <DirectoryView viewer={viewer} /> : <SingleFileView viewer={viewer} />}

      {viewer.uploadProgress ? (
        <div className="share-viewer__upload">
          <UploadProgress
            label={viewer.uploadProgress.label}
            percent={viewer.uploadProgress.percent}
            detail={viewer.uploadProgress.detail}
            done={viewer.uploadProgress.done}
          />
        </div>
      ) : null}

      <Dialog open={!!viewer.preview} onOpenChange={(open) => !open && viewer.closePreview()}>
        <DialogContent className="share-viewer__preview-dialog">
          <DialogHeader>
            <DialogTitle>{viewer.preview?.file.title}</DialogTitle>
          </DialogHeader>
          {viewer.preview ? (
            <div className="share-viewer__preview-stage">
              <DriveMediaPreview
                file={viewer.preview.file}
                previewSrc={viewer.preview.url}
                mediaClassName="share-viewer__preview-media"
                videoControls
              />
            </div>
          ) : null}
          {viewer.preview ? (
            <Button
              variant="outline"
              icon={<Download />}
              label={shareLabels.download}
              onClick={() => viewer.download(viewer.preview!.file)}
            />
          ) : null}
        </DialogContent>
      </Dialog>
    </ShareFrame>
  );
}

type ShareViewerController = ReturnType<typeof useShareViewer>;

function DirectoryView({ viewer }: { viewer: ShareViewerController }) {
  return (
    <div
      className="share-viewer"
      onDragOver={(event) => {
        if (!viewer.canWrite || !event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
      }}
      onDrop={(event) => {
        if (!viewer.canWrite || !event.dataTransfer.types.includes("Files")) return;
        event.preventDefault();
        viewer.uploadFiles(event.dataTransfer.files);
      }}
    >
      <PathBreadcrumb
        className="share-viewer__breadcrumbs"
        leadingIcon={<Folder className="size-[1.125rem]" />}
        items={viewer.breadcrumbs}
        currentPath={viewer.relPath}
        onNavigate={(path) => viewer.navigate(path)}
      />

      {viewer.loading ? (
        <CollectionState variant="loading">{shareLabels.folderLoading}</CollectionState>
      ) : viewer.files.length === 0 ? (
        <CollectionState icon={<Cloud className="size-12" />}>
          {shareLabels.emptyFolder}
        </CollectionState>
      ) : (
        <ul className="share-viewer__grid">
          {viewer.files.map((file) => (
            <ShareTile key={file.id} file={file} viewer={viewer} />
          ))}
        </ul>
      )}
    </div>
  );
}

function ShareTile({ file, viewer }: { file: DriveFile; viewer: ShareViewerController }) {
  return (
    <li className="share-viewer__tile">
      <button
        type="button"
        className="share-viewer__tile-button"
        onClick={() => viewer.openFile(file)}
      >
        <span className="share-viewer__tile-icon" aria-hidden="true">
          {file.kind === "folder" ? <Folder className="size-10" /> : kindIconLg[file.kind]}
        </span>
        <span className="share-viewer__tile-title">{file.title}</span>
        {file.kind !== "folder" ? (
          <span className="share-viewer__tile-meta">{file.size}</span>
        ) : null}
      </button>
      {file.kind !== "folder" ? (
        <IconButton
          className="share-viewer__tile-download"
          label={`${shareLabels.download} ${file.title}`}
          icon={<Download />}
          size="sm"
          variant="subtle"
          onClick={() => viewer.download(file)}
        />
      ) : null}
    </li>
  );
}

function SingleFileView({ viewer }: { viewer: ShareViewerController }) {
  const file = viewer.singleFile;
  if (!file) return null;
  return (
    <div className="share-viewer__single">
      <div className="share-viewer__single-preview">
        <DriveMediaPreview
          file={file}
          previewSrc={viewer.preview?.url}
          mediaClassName="share-viewer__preview-media"
          videoControls
        />
      </div>
      <h2 className="share-viewer__single-title">{file.title}</h2>
      <Button
        variant="primary"
        icon={<Download />}
        label={shareLabels.download}
        onClick={() => viewer.download(file)}
      />
    </div>
  );
}
