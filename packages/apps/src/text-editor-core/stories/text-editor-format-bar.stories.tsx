import type { Meta, StoryObj } from "@storybook/react-vite";
import { EditorContent } from "@tiptap/react";
import { TextEditorFormatBar } from "@/text-editor-core/src/text-editor-format-bar";
import {
  TEXT_EDITOR_CONTENT_FORMATS,
  type TextEditorContentFormat,
} from "@/text-editor-core/src/text-editor-content";
import { textEditorDemoContent } from "@/text-editor-core/src/text-editor-fixtures";
import { useTextEditor } from "@/text-editor-core/src/use-text-editor";
import { TextEditorStoryScope } from "@/text-editor-core/stories/text-editor-story-scope";

type FormatBarStoryArgs = {
  format: TextEditorContentFormat;
  showPrint: boolean;
  editable: boolean;
};

function TextEditorFormatBarDemo({ format, showPrint, editable }: FormatBarStoryArgs) {
  const editor = useTextEditor({
    format,
    editable,
    content: textEditorDemoContent(format),
  });

  return (
    <>
      <TextEditorFormatBar editor={editor} showPrint={showPrint} />
      <div className="text-editor-format-bar-story__body">
        <EditorContent editor={editor} />
      </div>
    </>
  );
}

const meta = {
  title: "Shared/TextEditor/TextEditorFormatBar",
  component: TextEditorFormatBar,
  tags: ["autodocs"],
  parameters: {
    layout: "padded",
    docs: {
      description: {
        component:
          "Sticky formatting toolbar. Pair with a TipTap editor instance; stories use a compact inline body (not the letter sheet).",
      },
    },
  },
  render: (args: FormatBarStoryArgs) => (
    <TextEditorStoryScope variant="format-bar">
      <TextEditorFormatBarDemo {...args} />
    </TextEditorStoryScope>
  ),
  argTypes: {
    format: {
      control: "select",
      options: TEXT_EDITOR_CONTENT_FORMATS,
    },
    showPrint: { control: "boolean" },
    editable: { control: "boolean" },
  },
} satisfies Meta<FormatBarStoryArgs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Html: Story = {
  args: {
    format: "html",
    showPrint: true,
    editable: true,
  },
};

export const Markdown: Story = {
  args: {
    format: "markdown",
    showPrint: false,
    editable: true,
  },
};

export const ReadOnly: Story = {
  name: "Read only",
  args: {
    format: "html",
    showPrint: false,
    editable: false,
  },
};
