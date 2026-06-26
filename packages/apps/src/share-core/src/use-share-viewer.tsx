import { useCallback, useEffect, useRef, useState } from "react";
import { useAppToast } from "@/hooks/use-app-toast";
import type { PathBreadcrumbItem } from "@/path-breadcrumb/src/path-breadcrumb";
import type { DriveAPIOperations, DriveUploadProgress } from "@/drive-core/src/drive-types";
import type { DriveFile } from "@/drive-core/src/drive-models";
import { formatBytesCompact } from "@/drive-core/src/drive-file-utils";
import {
  shareBreadcrumbs,
  shareFileFromEntry,
  shareFileFromName,
} from "@/share-core/src/share-file-utils";
import type { WgwSharePublicMeta } from "@/lib/api/wgw/shares-types";

export type ShareUploadProgressView = {
  label: string;
  percent: number;
  detail: string;
  done: boolean;
};

export type ShareViewerPreview = { file: DriveFile; url: string };

export type UseShareViewerArgs = {
  meta: WgwSharePublicMeta;
  operations: DriveAPIOperations;
};

export function useShareViewer({ meta, operations }: UseShareViewerArgs) {
  const { show, showError } = useAppToast();
  const isDirectory = meta.targetType === "dir";
  const canWrite = meta.permission === "write";

  const [relPath, setRelPath] = useState("");
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [singleFile] = useState<DriveFile | null>(() =>
    isDirectory ? null : shareFileFromName(meta.name),
  );
  const [loading, setLoading] = useState(isDirectory);
  const [preview, setPreview] = useState<ShareViewerPreview | null>(null);
  const [uploadProgress, setUploadProgress] = useState<ShareUploadProgressView | null>(null);
  const previewUrlRef = useRef<string | null>(null);

  const releasePreview = useCallback(() => {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }
  }, []);

  const load = useCallback(
    async (path: string) => {
      setLoading(true);
      try {
        const data = await operations.listDirectory(path);
        setFiles(data.directory.files.map(shareFileFromEntry));
        setRelPath(path);
      } catch (error) {
        showError(error instanceof Error ? error.message : String(error));
      } finally {
        setLoading(false);
      }
    },
    [operations, showError],
  );

  useEffect(() => {
    if (isDirectory) void load("");
    return releasePreview;
  }, [isDirectory, load, releasePreview]);

  const navigate = useCallback(
    (path: string) => {
      void load(path);
    },
    [load],
  );

  const openFile = useCallback(
    async (file: DriveFile) => {
      if (file.kind === "folder") {
        navigate(file.apiPath ?? file.id);
        return;
      }
      const path = file.apiPath ?? "";
      if (file.kind === "image" || file.kind === "video") {
        try {
          const blob = await operations.readFileBlob(path);
          releasePreview();
          const url = URL.createObjectURL(blob);
          previewUrlRef.current = url;
          setPreview({ file, url });
        } catch (error) {
          showError(error instanceof Error ? error.message : String(error));
        }
        return;
      }
      void download(file);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [navigate, operations, releasePreview, showError],
  );

  const download = useCallback(
    async (file: DriveFile) => {
      try {
        await operations.downloadFile(file.apiPath ?? "");
      } catch (error) {
        showError(error instanceof Error ? error.message : String(error));
      }
    },
    [operations, showError],
  );

  const closePreview = useCallback(() => {
    releasePreview();
    setPreview(null);
  }, [releasePreview]);

  // Auto-load an inline preview for single-file image/video shares.
  useEffect(() => {
    if (!singleFile) return;
    if (singleFile.kind === "image" || singleFile.kind === "video") {
      void openFile(singleFile);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [singleFile]);

  const uploadFiles = useCallback(
    (fileList: FileList | null) => {
      if (!fileList || fileList.length === 0 || !canWrite) return;
      const selected = Array.from(fileList);
      const totalBytes = selected.reduce((sum, file) => sum + file.size, 0);
      setUploadProgress({
        label:
          selected.length === 1
            ? `Uploading ${selected[0]!.name}`
            : `Uploading ${selected.length} files`,
        percent: 0,
        detail: `0 / ${formatBytesCompact(totalBytes)}`,
        done: false,
      });
      void operations
        .uploadFiles(
          { cwd: relPath, files: selected },
          {
            onProgress: (progress: DriveUploadProgress) => {
              const denom = Math.max(1, progress.totalBytes);
              setUploadProgress({
                label:
                  progress.currentFileName.trim() !== ""
                    ? `Uploading ${progress.currentFileName}`
                    : "Uploading files",
                percent: Math.min(100, Math.round((progress.uploadedBytes / denom) * 100)),
                detail: `${formatBytesCompact(progress.uploadedBytes)} / ${formatBytesCompact(progress.totalBytes)} · ${progress.filesCompleted}/${progress.filesTotal} files`,
                done: false,
              });
            },
          },
        )
        .then((data) => {
          setFiles(data.directory.files.map(shareFileFromEntry));
          setUploadProgress({
            label: `Uploaded ${selected.length} file${selected.length === 1 ? "" : "s"}`,
            percent: 100,
            detail: "Upload complete",
            done: true,
          });
          show(`Uploaded ${selected.length} file${selected.length === 1 ? "" : "s"}`);
          window.setTimeout(() => setUploadProgress(null), 1400);
        })
        .catch((error: unknown) => {
          setUploadProgress(null);
          showError(error instanceof Error ? error.message : String(error));
        });
    },
    [canWrite, operations, relPath, show, showError],
  );

  const breadcrumbs: PathBreadcrumbItem[] = shareBreadcrumbs(meta.name, relPath);

  return {
    isDirectory,
    canWrite,
    relPath,
    files,
    singleFile,
    loading,
    breadcrumbs,
    preview,
    uploadProgress,
    navigate,
    openFile,
    download,
    closePreview,
    uploadFiles,
    reload: () => load(relPath),
  };
}
