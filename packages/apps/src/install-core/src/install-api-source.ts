import { createWorkspaceSource } from "@/lib/api/create-workspace-source";
import { createInstallAppBootstrap } from "@/lib/api/mock/install-bootstrap";
import { createMockInstallOperations } from "@/lib/api/mock/install-mock-operations";
import { wgwLiveApiEnabled } from "@/lib/api/wgw/http";
import { fetchInstallerBootstrap } from "@/lib/api/wgw/installer";
import type { InstallAPIOperations, InstallUIData } from "@/install-core/src/install-types";
import { wgwInstallOperations } from "@/install-core/src/install-wgw-operations";

export type InstallApiSource = {
  loadBootstrap: () => Promise<InstallUIData>;
  createOperations: (data: InstallUIData) => InstallAPIOperations | undefined;
};

async function loadLiveInstallBootstrap(): Promise<InstallUIData> {
  const response = await fetchInstallerBootstrap();
  return { state: response.state ?? null };
}

export function createWgwInstallApiSource(): InstallApiSource {
  return {
    loadBootstrap: loadLiveInstallBootstrap,
    createOperations: () => wgwInstallOperations,
  };
}

export function createDefaultInstallApiSource(): InstallApiSource {
  return createWorkspaceSource<InstallApiSource>({
    isLive: wgwLiveApiEnabled(),
    createMockSource: () => ({
      loadBootstrap: () => Promise.resolve(createInstallAppBootstrap().data),
      createOperations: (data) => {
        const seed = data.state ?? createInstallAppBootstrap().data.state;
        return seed ? createMockInstallOperations(seed) : undefined;
      },
    }),
    createLiveSource: createWgwInstallApiSource,
  });
}
