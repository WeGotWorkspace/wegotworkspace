import { useCallback, useState } from "react";
import { Button } from "@/button/src/button";
import { RenameFilenameField } from "@/dialogs/src/rename-filename-field";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/ui/dialog";
import { splitMarkdownDialogDefaultName } from "@/drive-core/src/drive-create-markdown-dialog-utils";
import { DriveFolderPicker } from "@/drive-core/src/drive-folder-picker";
import type { DriveFile, ViewKey } from "@/drive-core/src/drive-models";
import type { DriveUILabels } from "@/drive-core/src/drive-labels";
import type { DriveAPIOperations } from "@/drive-core/src/drive-types";
import { joinFileNameForRename } from "@/lib/files/filename-rename";

export function DriveCreateMarkdownDialog({
  open,
  labels,
  defaultName,
  initialBrowsePath,
  files,
  groupPaths,
  view: _view,
  operations,
  currentUsername,
  groupRootNames,
  isSubmitting = false,
  errorMessage,
  onClose,
  onConfirm,
}: {
  open: boolean;
  labels: DriveUILabels;
  defaultName: string;
  initialBrowsePath: string;
  files: DriveFile[];
  groupPaths: string[];
  view: ViewKey;
  operations?: DriveAPIOperations;
  currentUsername: string;
  groupRootNames: Set<string>;
  isSubmitting?: boolean;
  errorMessage?: string | null;
  onClose: () => void;
  onConfirm: (fileName: string, destinationPath: string) => void;
}) {
  const { extension } = splitMarkdownDialogDefaultName(defaultName);
  const [draftBaseName, setDraftBaseName] = useState("");
  const [focusSession, setFocusSession] = useState<string | null>(null);
  const [destinationPath, setDestinationPath] = useState<string | null>(null);
  const nextFocusSession = open ? defaultName : null;

  if (nextFocusSession !== focusSession) {
    setFocusSession(nextFocusSession);
    if (nextFocusSession) {
      setDraftBaseName(splitMarkdownDialogDefaultName(defaultName).baseName);
      setDestinationPath(null);
    }
  }

  const handleDestinationChange = useCallback((path: string | null) => {
    setDestinationPath(path);
  }, []);

  const fileName = joinFileNameForRename(draftBaseName, extension);
  const canSubmit = draftBaseName.trim().length > 0 && !!destinationPath && !isSubmitting;

  const handleConfirm = () => {
    if (!canSubmit || !destinationPath) return;
    onConfirm(fileName, destinationPath);
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="drive-dialog-surface sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{labels.createMarkdownDialogTitle}</DialogTitle>
          <DialogDescription>{labels.createMarkdownDialogDescription}</DialogDescription>
        </DialogHeader>

        <RenameFilenameField
          focusKey={nextFocusSession}
          placeholder={labels.createMarkdownDialogNamePlaceholder}
          baseName={draftBaseName}
          extension={extension}
          disabled={isSubmitting}
          onBaseNameChange={setDraftBaseName}
          onEnter={handleConfirm}
        />

        {open ? (
          <DriveFolderPicker
            key={initialBrowsePath}
            labels={labels}
            files={files}
            groupPaths={groupPaths}
            moveIds={[]}
            initialBrowsePath={initialBrowsePath}
            operations={operations}
            currentUsername={currentUsername}
            groupRootNames={groupRootNames}
            onDestinationChange={handleDestinationChange}
          />
        ) : null}

        {errorMessage ? (
          <p className="text-sm text-destructive" role="alert">
            {errorMessage}
          </p>
        ) : null}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isSubmitting}>
            {labels.createMarkdownDialogCancel}
          </Button>
          <Button variant="primary" disabled={!canSubmit} onClick={handleConfirm}>
            {labels.createMarkdownDialogConfirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
