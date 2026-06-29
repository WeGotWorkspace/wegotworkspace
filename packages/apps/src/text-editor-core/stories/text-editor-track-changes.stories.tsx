import type { Meta, StoryObj } from "@storybook/react-vite";
import { DocsCollabEditor } from "@/text-editor-core/docs-collab/docs-collab-editor";
import { useMockDocsCollabEditorSession } from "@/text-editor-core/stories/text-editor-collab-stories.harness";

import "@/text-editor-core/src/text-editor.css";
import "@/docs-core/src/docs-workspace.css";

function SuggestModeHarness() {
  const session = useMockDocsCollabEditorSession("Alex");
  return (
    <div className="docs-workspace flex min-h-[min(900px,90dvh)] flex-col p-6">
      <p className="mb-3 text-sm text-muted-foreground">
        Switch to <strong>Suggest</strong>, edit the document, then accept or reject proposals from
        the suggestions sidebar.
      </p>
      <DocsCollabEditor
        ydoc={session.ydoc}
        awareness={session.awareness}
        user={session.user}
        format="markdown"
        sheetFill
        formatBar={{ showPrint: false }}
        onContentChange={() => {}}
      />
    </div>
  );
}

const meta = {
  title: "Shared/TextEditor/Docs collab/Suggest mode",
  component: DocsCollabEditor,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Offline Yjs-backed Docs editor with MIT `tiptap-track-changes` — edit/suggest toggle in the header and suggestion cards in the sidebar.",
      },
    },
  },
} satisfies Meta<typeof DocsCollabEditor>;

export default meta;
type Story = StoryObj<typeof DocsCollabEditor>;

export const Default: Story = {
  render: () => <SuggestModeHarness />,
};
