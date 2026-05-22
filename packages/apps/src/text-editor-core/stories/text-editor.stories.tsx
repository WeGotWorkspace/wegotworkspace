import type { Meta, StoryObj } from "@storybook/react-vite";
import { TextEditor } from "@/text-editor-core/src/text-editor";
import {
  TEXT_EDITOR_CONTENT_FORMATS,
  type TextEditorContentFormat,
} from "@/text-editor-core/src/text-editor-content";
import { textEditorDemoContent } from "@/text-editor-core/src/text-editor-fixtures";
import { TextEditorStoryScope } from "@/text-editor-core/stories/text-editor-story-scope";

const meta = {
  title: "Shared/TextEditor/TextEditor",
  component: TextEditor,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          'Full rich-text editor: formatting toolbar, letter sheet, slash menu, and table controls. Use `format="html"` for mail bodies or `format="markdown"` for notes.',
      },
    },
  },
  render: (args) => (
    <TextEditorStoryScope>
      <TextEditor {...args} />
    </TextEditorStoryScope>
  ),
  argTypes: {
    format: {
      control: "select",
      options: TEXT_EDITOR_CONTENT_FORMATS,
    },
    editable: { control: "boolean" },
    showPrint: { control: "boolean" },
    placeholder: { control: "text" },
  },
} satisfies Meta<typeof TextEditor>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Html: Story = {
  args: {
    format: "html",
    content: textEditorDemoContent("html"),
    editable: true,
    showPrint: true,
  },
};

export const Markdown: Story = {
  args: {
    format: "markdown",
    content: textEditorDemoContent("markdown"),
    editable: true,
    showPrint: true,
  },
};

export const ReadOnlyMarkdown: Story = {
  name: "Read only markdown",
  args: {
    format: "markdown",
    content: textEditorDemoContent("markdown"),
    editable: false,
    showPrint: false,
  },
};

export const EmptyMarkdown: Story = {
  name: "Empty markdown",
  args: {
    format: "markdown",
    content: "",
    editable: true,
    placeholder: "Start writing, or type / for blocks…",
    showPrint: false,
  },
};
