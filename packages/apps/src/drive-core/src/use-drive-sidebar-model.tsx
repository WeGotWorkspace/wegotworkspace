import { useMemo } from "react";
import { Clock, HardDrive, Star, Trash2 } from "lucide-react";
import type { ViewKey } from "@/drive-core/src/drive-models";
import type { DriveUILabels } from "@/drive-core/src/drive-labels";
import type { MenuItemProps } from "@/menu-item/src/menu-item";

type UseDriveSidebarModelArgs = {
  labels: DriveUILabels;
  view: ViewKey;
  sidebarGroupPaths: string[];
  selectView: (view: ViewKey) => void;
  sidebarDropZoneProps: (
    targetKey: string,
    onDrop: (ids: string[]) => void,
  ) => Pick<MenuItemProps, "isDropTarget" | "onDragOver" | "onDragLeave" | "onDrop">;
  moveToFolder: (ids: string[], parent: string) => void;
};

function isMyDriveView(view: ViewKey) {
  return view.type === "folder" && (view.path === "My Drive" || view.path.startsWith("My Drive/"));
}

function isTrashView(view: ViewKey) {
  return view.type === "folder" && (view.path === "Trash" || view.path.startsWith("Trash/"));
}

function isGroupView(view: ViewKey, groupPath: string) {
  return view.type === "folder" && (view.path === groupPath || view.path.startsWith(`${groupPath}/`));
}

export function useDriveSidebarModel({
  labels,
  view,
  sidebarGroupPaths,
  selectView,
  sidebarDropZoneProps,
  moveToFolder,
}: UseDriveSidebarModelArgs) {
  const primarySidebarItems = useMemo<MenuItemProps[]>(
    () => [
      {
        label: labels.sidebarMyDrive,
        selected: isMyDriveView(view),
        onClick: () => selectView({ type: "folder", path: "My Drive" }),
        icon: <HardDrive className="size-3.5" />,
        ...sidebarDropZoneProps("My Drive", (ids) => moveToFolder(ids, "My Drive")),
      },
      {
        label: labels.sidebarRecent,
        selected: view.type === "recent",
        onClick: () => selectView({ type: "recent" }),
        icon: <Clock className="size-3.5" />,
      },
      {
        label: labels.sidebarStarred,
        selected: view.type === "starred",
        onClick: () => selectView({ type: "starred" }),
        icon: <Star className="size-3.5" />,
      },
      {
        label: labels.sidebarTrash,
        selected: isTrashView(view),
        onClick: () => selectView({ type: "folder", path: "Trash" }),
        icon: <Trash2 className="size-3.5" />,
        ...sidebarDropZoneProps("Trash", (ids) => moveToFolder(ids, "Trash")),
      },
    ],
    [labels, moveToFolder, selectView, sidebarDropZoneProps, view],
  );

  const groupSidebarItems = useMemo<MenuItemProps[]>(
    () =>
      sidebarGroupPaths.map((groupPath) => ({
        label: groupPath.split("/").pop() ?? groupPath,
        selected: isGroupView(view, groupPath),
        onClick: () => selectView({ type: "folder", path: groupPath }),
        icon: <HardDrive className="size-3.5" />,
        ...sidebarDropZoneProps(groupPath, (ids) => moveToFolder(ids, groupPath)),
      })),
    [moveToFolder, selectView, sidebarDropZoneProps, sidebarGroupPaths, view],
  );

  return { primarySidebarItems, groupSidebarItems };
}
