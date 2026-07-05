import { kindIcon } from "@/drive-core/src/drive-icons";
import type { DriveFile } from "@/drive-core/src/drive-models";
import type { DriveUILabels } from "@/drive-core/src/drive-labels";
import { useDriveColumnView } from "@/drive-core/src/use-drive-column-view";
import type { DriveAPIOperations } from "@/drive-core/src/drive-types";
import { ColumnBrowser, type ColumnBrowserItem } from "@/column-browser/src/column-browser";

export type DriveColumnViewProps = {
  rootPath: string;
  seedItems: readonly DriveFile[];
  allFiles: readonly DriveFile[];
  operations?: DriveAPIOperations;
  currentUsername: string;
  groupRootNames: readonly string[];
  resetKey: string;
  labels: DriveUILabels;
  activeId: string | null;
  onSelectFile: (file: DriveFile) => void;
  onOpenFolder: (file: DriveFile) => void;
};

export function DriveColumnView({
  rootPath,
  seedItems,
  allFiles,
  operations,
  currentUsername,
  groupRootNames,
  resetKey,
  labels,
  activeId,
  onSelectFile,
  onOpenFolder,
}: DriveColumnViewProps) {
  const { columns, openFolder } = useDriveColumnView({
    rootPath,
    seedItems,
    allFiles,
    operations,
    currentUsername,
    groupRootNames,
    resetKey,
  });

  const fileById = (id: string) =>
    allFiles.find((file) => file.id === id) ??
    columns.flatMap((column) => column.items).find((file) => file.id === id) ??
    null;

  const browserColumns = columns.map((column) => ({
    id: column.path,
    title: column.title,
    loading: column.loading,
    emptyLabel: labels.emptyFolder,
    items: column.items.map(
      (file): ColumnBrowserItem => ({
        id: file.id,
        title: file.title,
        kind: file.kind === "folder" ? "folder" : "file",
        icon: file.kind === "folder" ? undefined : kindIcon[file.kind],
      }),
    ),
  }));

  const handleSelectItem = (columnIndex: number, item: ColumnBrowserItem) => {
    const file =
      columns[columnIndex]?.items.find((entry) => entry.id === item.id) ?? fileById(item.id);
    if (!file) return;
    if (file.kind === "folder") {
      openFolder(columnIndex, file);
      onOpenFolder(file);
      return;
    }
    onSelectFile(file);
  };

  return (
    <ColumnBrowser
      columns={browserColumns}
      selectedItemId={activeId}
      onSelectItem={handleSelectItem}
    />
  );
}
