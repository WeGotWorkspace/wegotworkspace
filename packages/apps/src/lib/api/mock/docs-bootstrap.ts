import { DOCS_DEMO_MARKDOWN } from "@/docs-core/src/docs-demo-content";
import type { DocsAppBootstrap } from "@/docs-core/src/docs-types";
import { mockWorkspaceSession } from "./workspace-session-mock";

export function createDocsAppBootstrap(overrides?: Partial<DocsAppBootstrap>): DocsAppBootstrap {
  return {
    session: overrides?.session ?? mockWorkspaceSession,
    data: overrides?.data ?? {
      document: {
        apiPath: "/users/demo/readme.md",
        fileName: "readme.md",
        content: DOCS_DEMO_MARKDOWN,
      },
    },
  };
}
