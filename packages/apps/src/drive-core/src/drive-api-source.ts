import { createWorkspaceSource } from "@/lib/api/create-workspace-source";
import { wgwLiveApiEnabled } from "@/lib/api/wgw/http";
import { createDriveAppBootstrap } from "@/lib/api/mock/drive-bootstrap";
import { createWgwDriveOperations, fetchDriveLiveBootstrap } from "@/lib/api/wgw/drive";
import type { DriveAPIOperations, DriveAppBootstrap } from "@/drive-core/src/drive-types";

export type DriveApiSource = {
  loadBootstrap: () => Promise<DriveAppBootstrap>;
  createOperations: (bootstrap?: DriveAppBootstrap) => DriveAPIOperations | undefined;
};

export function createWgwDriveApiSource(): DriveApiSource {
  return {
    loadBootstrap: fetchDriveLiveBootstrap,
    createOperations: (bootstrap) => createWgwDriveOperations(bootstrap?.data.cwd ?? "/"),
  };
}

export function createDefaultDriveApiSource(): DriveApiSource {
  return createWorkspaceSource<DriveApiSource>({
    isLive: wgwLiveApiEnabled(),
    createMockSource: () => ({
      loadBootstrap: () => Promise.resolve(createDriveAppBootstrap()),
      createOperations: () => undefined,
    }),
    createLiveSource: createWgwDriveApiSource,
  });
}
