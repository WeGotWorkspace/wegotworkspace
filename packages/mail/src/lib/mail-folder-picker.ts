import type { Folder } from "./mail-store";

/** Sentinel value for “create at account top level” in mailbox pickers. */
export const MAILBOX_PICKER_ROOT = "__root__";

/** Folders shown in Move-to and New-mailbox location pickers (non-virtual IMAP mailboxes). */
export function listMailboxPickerFolders(folders: Folder[]): Folder[] {
  return folders.filter((f) => !f.virtual && f.id !== "__starred__");
}

/** Same as {@link listMailboxPickerFolders} but excluding the current folder (e.g. move source). */
export function listMoveTargetFolders(folders: Folder[], excludeFolderId: string): Folder[] {
  return listMailboxPickerFolders(folders).filter((f) => f.id !== excludeFolderId);
}

/** The folder and every descendant id (cannot reparent under self). */
export function folderSubtreeIds(folders: Folder[], rootId: string): string[] {
  const ids: string[] = [];
  const walk = (id: string) => {
    ids.push(id);
    for (const f of folders) {
      if (f.parentId === id) walk(f.id);
    }
  };
  walk(rootId);
  return ids;
}
