import { parentAndName } from "@/lib/api/wgw/drive";
import { DOCS_DEMO_MARKDOWN } from "@/docs-core/src/docs-demo-content";
import type { DocsAPIOperations } from "@/docs-core/src/docs-types";

/** Storybook / mock shell: in-memory rename without Drive API. */
export function createMockDocsOperations(): DocsAPIOperations {
  return {
    async loadFile() {
      return DOCS_DEMO_MARKDOWN;
    },
    async saveFile() {},
    async renameFile(apiPath, newName) {
      const { destination } = parentAndName(apiPath);
      return destination === "/" ? `/${newName}` : `${destination}/${newName}`;
    },
  };
}
