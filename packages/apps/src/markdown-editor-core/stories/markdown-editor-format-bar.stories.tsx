import type { Meta, StoryObj } from "@storybook/react-vite";
import { MarkdownEditorFormatBar } from "@/markdown-editor-core/src/markdown-editor-format-bar";
import { MarkdownEditorSheet } from "@/markdown-editor-core/src/markdown-editor-sheet";
import { MARKDOWN_EDITOR_DEMO_HTML } from "@/markdown-editor-core/src/markdown-editor-fixtures";
import { useMarkdownEditor } from "@/markdown-editor-core/src/use-markdown-editor";
import { MarkdownEditorStoryScope } from "@/markdown-editor-core/stories/markdown-editor-story-scope";

function FormatBarHarness({
  showPrint = true,
  content = MARKDOWN_EDITOR_DEMO_HTML,
}: {
  showPrint?: boolean;
  content?: string;
}) {
  const editor = useMarkdownEditor({ content });

  return (
    <>
      <MarkdownEditorFormatBar editor={editor} showPrint={showPrint} />
      <div className="flex min-h-0 flex-1">
        <MarkdownEditorSheet editor={editor} className="flex-1" />
      </div>
    </>
  );
}

const meta = {
  title: "Shared/MarkdownEditor/MarkdownEditorFormatBar",
  component: MarkdownEditorFormatBar,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Sticky formatting toolbar for the TipTap editor. Requires an editor instance; stories pair it with the sheet for interaction.",
      },
    },
  },
  render: (args) => (
    <MarkdownEditorStoryScope>
      <FormatBarHarness showPrint={args.showPrint} />
    </MarkdownEditorStoryScope>
  ),
  argTypes: {
    showPrint: { control: "boolean" },
  },
} satisfies Meta<typeof MarkdownEditorFormatBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    showPrint: true,
  },
};

export const WithoutPrint: Story = {
  name: "Without print",
  args: {
    showPrint: false,
  },
};
