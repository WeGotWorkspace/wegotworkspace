import { useMemo, useSyncExternalStore } from "react";
import { getDriveRecent, type DriveRecentEntry } from "@/lib/driveRecent";
import { getDriveStarred, type DriveStarredEntry } from "@/lib/driveStarred";
import { subscribeDriveLocalStorage } from "@/lib/driveStorageNotify";

let clientVersion = 0;

function subscribe(callback: () => void) {
  return subscribeDriveLocalStorage(() => {
    clientVersion += 1;
    callback();
  });
}

function getSnapshot() {
  return clientVersion;
}

function getServerSnapshot() {
  return 0;
}

/** Bumps when starred or recent localStorage changes (this tab or another). */
export function useDriveLocalLists(): { recent: DriveRecentEntry[]; starred: DriveStarredEntry[] } {
  const version = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return useMemo(
    () => ({ recent: getDriveRecent(), starred: getDriveStarred() }),
    [version],
  );
}
