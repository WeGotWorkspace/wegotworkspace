import { useMemo } from "react";
import { Files, HardDrive, Users } from "lucide-react";
import type { MenuItemProps } from "@/menu-item/src/menu-item";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";
import type { DocsHomeDrive } from "@/docs-core/src/docs-home-drives";

type UseDocsHomeSidebarModelArgs = {
  labels: DocsUILabels;
  drives: DocsHomeDrive[];
  /** Currently selected drive `pathPrefix`, or `null` for the "All docs" view. */
  selectedDrivePrefix: string | null;
  selectDrive: (pathPrefix: string | null) => void;
};

export function useDocsHomeSidebarModel({
  labels,
  drives,
  selectedDrivePrefix,
  selectDrive,
}: UseDocsHomeSidebarModelArgs) {
  const primaryItems = useMemo<MenuItemProps[]>(
    () => [
      {
        label: labels.homeAllDocs,
        icon: <Files className="size-3.5" />,
        selected: selectedDrivePrefix === null,
        onClick: () => selectDrive(null),
      },
    ],
    [labels.homeAllDocs, selectDrive, selectedDrivePrefix],
  );

  const driveItems = useMemo<MenuItemProps[]>(
    () =>
      drives.map((drive) => ({
        label: drive.label,
        icon: drive.pathPrefix.startsWith("users/") ? (
          <HardDrive className="size-3.5" />
        ) : (
          <Users className="size-3.5" />
        ),
        selected: selectedDrivePrefix === drive.pathPrefix,
        onClick: () => selectDrive(drive.pathPrefix),
      })),
    [drives, selectDrive, selectedDrivePrefix],
  );

  return { primaryItems, driveItems };
}
