import { useEffect, useMemo } from "react";
import { createDriveAppBootstrap } from "@/lib/api/mock/drive-bootstrap";
import type { DriveFile } from "@/drive-core/src/drive-models";
import { useDriveController } from "@/drive-core/src/use-drive-controller";
import { DRIVE_MOCK_FILES } from "@/drive-core/src/drive-mock-files";

export type DrivePaneStoryHarnessOptions = {
  listLoading?: boolean;
  filesOverride?: DriveFile[];
  viewPath?: string;
};

export type DriveModalStoryPreset = "newFolder" | "rename" | "deleteTrash" | "deletePermanent";

export function useDrivePaneStoryController(options?: DrivePaneStoryHarnessOptions) {
  const bootstrap = useMemo(() => createDriveAppBootstrap(), []);

  const controller = useDriveController({
    data: bootstrap.data,
    session: bootstrap.session,
    operations: undefined,
    listLoading: options?.listLoading ?? false,
  });

  const { setFiles, setView } = controller;

  useEffect(() => {
    if (options?.filesOverride) {
      setFiles(options.filesOverride);
    }
  }, [options?.filesOverride, setFiles]);

  useEffect(() => {
    if (options?.viewPath) {
      setView({ type: "folder", path: options.viewPath });
    }
  }, [options?.viewPath, setView]);

  return controller;
}

export function useDriveModalStoryController(preset: DriveModalStoryPreset) {
  const controller = useDrivePaneStoryController();
  const { setNewFolderDialogOpen, setRenameDialog, setRenameName, setConfirmDelete } = controller;

  useEffect(() => {
    setNewFolderDialogOpen(false);
    setRenameDialog(null);
    setRenameName("");
    setConfirmDelete(null);

    const sample = DRIVE_MOCK_FILES.find((file) => file.kind === "doc") ?? DRIVE_MOCK_FILES[0]!;

    switch (preset) {
      case "newFolder":
        setNewFolderDialogOpen(true);
        break;
      case "rename":
        setRenameDialog({ id: sample.id });
        setRenameName(sample.title);
        break;
      case "deleteTrash":
        setConfirmDelete({ ids: [sample.id], permanent: false });
        break;
      case "deletePermanent":
        setConfirmDelete({
          ids: DRIVE_MOCK_FILES.slice(0, 2).map((file) => file.id),
          permanent: true,
        });
        break;
    }
  }, [preset, setConfirmDelete, setNewFolderDialogOpen, setRenameDialog, setRenameName]);

  return controller;
}
