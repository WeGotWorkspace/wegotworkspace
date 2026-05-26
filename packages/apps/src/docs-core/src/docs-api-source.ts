import { createWorkspaceSource } from "@/lib/api/create-workspace-source";
import { wgwFetchPrincipal, wgwLiveApiEnabled } from "@/lib/api/wgw/http";
import { createWgwDriveOperations, parentAndName } from "@/lib/api/wgw/drive";
import { createDocsAppBootstrap } from "@/lib/api/mock/docs-bootstrap";
import type { DocsAPIOperations, DocsAppBootstrap } from "@/docs-core/src/docs-types";

export type DocsApiSource = {
  loadBootstrap: () => Promise<DocsAppBootstrap>;
  createOperations: () => DocsAPIOperations | undefined;
};

function createWgwDocsOperations(): DocsAPIOperations {
  const drive = createWgwDriveOperations("/");
  return {
    async loadFile(apiPath, opts) {
      const blob = await drive.readFileBlob(apiPath, opts);
      return blob.text();
    },
    async saveFile(apiPath, content, opts) {
      const { destination, from } = parentAndName(apiPath);
      const isPlainText = from.toLowerCase().endsWith(".txt");
      const mime = isPlainText ? "text/plain;charset=utf-8" : "text/markdown;charset=utf-8";
      const blob = new Blob([content], { type: mime });
      const file = new File([blob], from, {
        type: isPlainText ? "text/plain" : "text/markdown",
        lastModified: Date.now(),
      });
      await drive.checkUploadReady(opts);
      await drive.uploadFiles({ cwd: destination, files: [file] }, opts);
    },
    async renameFile(apiPath, newName, opts) {
      const { destination } = parentAndName(apiPath);
      await drive.renameItem({ destination, from: apiPath, to: newName }, opts);
      return destination === "/" ? `/${newName}` : `${destination}/${newName}`;
    },
  };
}

async function fetchDocsLiveBootstrap(): Promise<DocsAppBootstrap> {
  const session = await wgwFetchPrincipal();
  return { session, data: { document: null } };
}

export function createWgwDocsApiSource(): DocsApiSource {
  return {
    loadBootstrap: fetchDocsLiveBootstrap,
    createOperations: () => createWgwDocsOperations(),
  };
}

export function createDefaultDocsApiSource(): DocsApiSource {
  return createWorkspaceSource<DocsApiSource>({
    isLive: wgwLiveApiEnabled(),
    createMockSource: () => ({
      loadBootstrap: () => Promise.resolve(createDocsAppBootstrap()),
      createOperations: () => undefined,
    }),
    createLiveSource: createWgwDocsApiSource,
  });
}
