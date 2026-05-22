import type { DocsAppBootstrap } from "@/docs-core/src/docs-types";
import { mockWorkspaceSession } from "./workspace-session-mock";

const MOCK_MARKDOWN = `# Welcome to Docs

Edit this Markdown file in the rich text editor. Changes auto-save back to Drive.

- **Bold** and *italic* text
- Headings and lists
- Links and code blocks
`;

export function createDocsAppBootstrap(overrides?: Partial<DocsAppBootstrap>): DocsAppBootstrap {
  return {
    session: overrides?.session ?? mockWorkspaceSession,
    data: overrides?.data ?? {
      document: {
        apiPath: "/users/demo/readme.md",
        fileName: "readme.md",
        content: MOCK_MARKDOWN,
      },
    },
  };
}
