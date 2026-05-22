import type { Meta, StoryObj } from "@storybook/react-vite";
import { MarkdownEditorSheet } from "@/markdown-editor-core/src/markdown-editor-sheet";
import { MARKDOWN_EDITOR_DEMO_HTML } from "@/markdown-editor-core/src/markdown-editor-fixtures";
import { useMarkdownEditor } from "@/markdown-editor-core/src/use-markdown-editor";
import { MarkdownEditorStoryScope } from "@/markdown-editor-core/stories/markdown-editor-story-scope";

type SheetStoryArgs = {
  content?: string;
  editable?: boolean;
  placeholder?: string;
};

function SheetHarness({
  content = MARKDOWN_EDITOR_DEMO_HTML,
  editable = true,
  placeholder,
}: {
  content?: string;
  editable?: boolean;
  placeholder?: string;
}) {
  const editor = useMarkdownEditor({ content, editable, placeholder });

  return <MarkdownEditorSheet editor={editor} className="flex-1" />;
}

const meta = {
  title: "Shared/MarkdownEditor/MarkdownEditorSheet",
  component: MarkdownEditorSheet,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Letter-sized sheet with inline ProseMirror editing, slash command menu, and floating table controls.",
      },
    },
  },
  render: (args: SheetStoryArgs) => (
    <MarkdownEditorStoryScope>
      <SheetHarness {...args} />
    </MarkdownEditorStoryScope>
  ),
  argTypes: {
    editable: { control: "boolean" },
    placeholder: { control: "text" },
  },
} satisfies Meta<SheetStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const WithDemoContent: Story = {
  name: "With demo content",
  args: {
    content: MARKDOWN_EDITOR_DEMO_HTML,
    editable: true,
  },
};

export const Empty: Story = {
  args: {
    content: "<p></p>",
    editable: true,
    placeholder: "Press '/' for commands…",
  },
};

export const ReadOnly: Story = {
  name: "Read only",
  args: {
    content: MARKDOWN_EDITOR_DEMO_HTML,
    editable: false,
  },
};
