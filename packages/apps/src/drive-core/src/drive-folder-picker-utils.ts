import { DRIVE_TRASH_UI_PATH } from "@/drive-core/src/drive-path-utils";
import type { ViewKey } from "@/drive-core/src/drive-models";

function isTrashPath(path: string) {
  return path === DRIVE_TRASH_UI_PATH || path.startsWith(`${DRIVE_TRASH_UI_PATH}/`);
}

export function resolveDriveFolderPickerStartPath(
  view: ViewKey,
  singleItemParent?: string,
): string {
  if (view.type === "folder" && !isTrashPath(view.path)) return view.path;
  if (singleItemParent && !isTrashPath(singleItemParent)) return singleItemParent;
  return "My Drive";
}
