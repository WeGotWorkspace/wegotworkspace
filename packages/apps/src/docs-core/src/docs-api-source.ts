import { createWorkspaceSource } from "@/lib/api/create-workspace-source";
import { wgwLiveApiEnabled } from "@/lib/api/wgw/http";
import { createDocsAppBootstrap } from "@/lib/api/mock/docs-bootstrap";
import {
  createHybridDocsOperations,
  loadDocsBootstrapHybrid,
} from "@/lib/offline/docs/docs-hybrid-operations";
import { createWgwDocsDriveOperations } from "@/lib/offline/docs/docs-drive-operations";
import { resolveDocsOfflineUsername } from "@/lib/offline/offline-session";
import type { DocsAPIOperations, DocsAppBootstrap } from "@/docs-core/src/docs-types";

export type DocsApiSource = {
  loadBootstrap: () => Promise<DocsAppBootstrap>;
  createNetworkOperations: () => DocsAPIOperations;
  createOperations: (bootstrap?: DocsAppBootstrap) => DocsAPIOperations | undefined;
};

export function createHybridDocsApiSource(): DocsApiSource {
  return {
    loadBootstrap: loadDocsBootstrapHybrid,
    createNetworkOperations: () => createWgwDocsDriveOperations(),
    createOperations: (bootstrap) => {
      const username = resolveDocsOfflineUsername(bootstrap?.session.user.username);
      if (!username) return undefined;
      return createHybridDocsOperations(username);
    },
  };
}

export function createDefaultDocsApiSource(): DocsApiSource {
  return createWorkspaceSource<DocsApiSource>({
    isLive: wgwLiveApiEnabled(),
    createMockSource: () => ({
      loadBootstrap: () => Promise.resolve(createDocsAppBootstrap()),
      createNetworkOperations: () => createWgwDocsDriveOperations(),
      createOperations: (bootstrap) => {
        const username = resolveDocsOfflineUsername(bootstrap?.session.user.username);
        if (!username) return undefined;
        return createHybridDocsOperations(username);
      },
    }),
    createLiveSource: createHybridDocsApiSource,
  });
}
