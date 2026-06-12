import { createWorkspaceSource } from "@/lib/api/create-workspace-source";
import {
  createInstallAppBootstrap,
  type InstallAppBootstrap,
} from "@/lib/api/mock/install-bootstrap";
import { createMockInstallOperations } from "@/lib/api/mock/install-mock-operations";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import { wgwLiveApiEnabled } from "@/lib/api/wgw/http";
import { fetchInstallerBootstrap } from "@/lib/api/wgw/installer";
import type { InstallAPIOperations } from "@/install-core/src/install-types";
import { wgwInstallOperations } from "@/install-core/src/install-wgw-operations";

export type InstallApiSource = {
  loadBootstrap: () => Promise<InstallAppBootstrap>;
  createOperations: (
    _source: InstallApiSource,
    bootstrap: InstallAppBootstrap | null | undefined,
  ) => InstallAPIOperations | undefined;
};

async function loadLiveInstallBootstrap(): Promise<InstallAppBootstrap> {
  const response = await fetchInstallerBootstrap();
  return {
    data: { state: response.state ?? null },
    session: mockWorkspaceSession,
  };
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
      loadBootstrap: () => Promise.resolve(createInstallAppBootstrap()),
      createOperations: (_source, bootstrap) => {
        const seed = bootstrap?.data.state ?? createInstallAppBootstrap().data.state;
        return seed ? createMockInstallOperations(seed) : undefined;
      },
    }),
    createLiveSource: createWgwInstallApiSource,
  });
}
