import type { Meta, StoryObj } from "@storybook/react-vite";
import { MarkdownEditor } from "@/markdown-editor-core/src/markdown-editor";
import { MARKDOWN_EDITOR_DEMO_HTML } from "@/markdown-editor-core/src/markdown-editor-fixtures";
import { MarkdownEditorStoryScope } from "@/markdown-editor-core/stories/markdown-editor-story-scope";

const meta = {
  title: "Shared/MarkdownEditor/MarkdownEditor",
  component: MarkdownEditor,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Full rich-text editing experience: formatting toolbar, letter sheet, slash commands, and table controls.",
      },
    },
  },
  render: (args) => (
    <MarkdownEditorStoryScope>
      <MarkdownEditor {...args} />
    </MarkdownEditorStoryScope>
  ),
  argTypes: {
    editable: { control: "boolean" },
    showPrint: { control: "boolean" },
    placeholder: { control: "text" },
  },
} satisfies Meta<typeof MarkdownEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    content: MARKDOWN_EDITOR_DEMO_HTML,
    editable: true,
    showPrint: true,
  },
};

export const ReadOnly: Story = {
  name: "Read only",
  args: {
    content: MARKDOWN_EDITOR_DEMO_HTML,
    editable: false,
    showPrint: false,
  },
};

export const Empty: Story = {
  args: {
    content: "<p></p>",
    editable: true,
    placeholder: "Start writing, or type / for blocks…",
  },
};
