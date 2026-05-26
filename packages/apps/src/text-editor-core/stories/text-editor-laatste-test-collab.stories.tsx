import type { Meta, StoryObj } from "@storybook/react-vite";
import { LaatsteTestDocsCollabWorkspace } from "@/text-editor-core/laatste-test-collab/laatste-test-docs-collab-workspace";

import "@/text-editor-core/src/text-editor.css";

const storyDescription = `
Anonymous collaborative markdown editing using the **laatste-test** prototype stack:

- Signaling: \`laatste-test/signal.php\` (file-backed, no WGW login)
- Document: \`laatste-test/document.php\` + \`document.md\`
- Sync: Yjs over WebRTC data channels (same as \`laatste-test/mesh.js\` + \`editor.js\`)

### Run

1. Storybook starts PHP on **http://127.0.0.1:8081** automatically, or run \`pnpm dev:laatste-test-signal\` in another terminal.
2. \`pnpm dev:ui\` (Storybook on :6006)
3. Open this story — you will be prompted for a display name. Open a second window with a different name to test collab.
4. Type in one window — edits and carets should appear in the other.

No Laravel / JWT / \`collab/*\` API involved.
`;

const meta = {
  title: "Shared/TextEditor/Laatste test collab",
  component: LaatsteTestDocsCollabWorkspace,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: storyDescription,
      },
    },
  },
} satisfies Meta<typeof LaatsteTestDocsCollabWorkspace>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collab: Story = {
  name: "Collab",
};
