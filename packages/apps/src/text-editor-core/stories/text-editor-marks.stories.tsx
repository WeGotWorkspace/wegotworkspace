import type { Meta, StoryObj } from "@storybook/react-vite";
import { CommentMark, LegacySuggestionMark } from "@/text-editor-core/src/text-editor-extensions";
import { TextEditor } from "@/text-editor-core/src/text-editor";

import "@/text-editor-core/src/text-editor.css";

/** TipTap marks registered via {@link CommentMark} and {@link LegacySuggestionMark}. */
const MARKED_HTML = [
  "<p>Review this ",
  '<span data-comment-id="c-1" class="comment-mark">commented phrase</span>',
  " and accept this ",
  '<span data-suggestion-id="s-1" class="legacy-suggestion-mark">suggested edit</span>',
  " before publishing.</p>",
].join("");

const meta = {
  title: "Shared/TextEditor/Marks",
  component: TextEditor,
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component:
          "Collaboration review marks (`CommentMark`, `LegacySuggestionMark`) render inline highlights on HTML content.",
      },
    },
  },
} satisfies Meta<typeof TextEditor>;

export default meta;
type Story = StoryObj<typeof TextEditor>;

export const CommentMarkStory: Story = {
  name: "CommentMark",
  render: () => (
    <TextEditor format="html" content={MARKED_HTML} editable={false} formatBar={false} />
  ),
};

export const LegacySuggestionMarkStory: Story = {
  name: "LegacySuggestionMark",
  render: () => (
    <TextEditor format="html" content={MARKED_HTML} editable={false} formatBar={false} />
  ),
};

export const BothMarks: Story = {
  name: "Comment and legacy suggestion marks",
  render: () => (
    <TextEditor format="html" content={MARKED_HTML} editable={false} formatBar={false} />
  ),
};
