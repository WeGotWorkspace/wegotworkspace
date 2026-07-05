import type { Meta, StoryObj } from "@storybook/react-vite";
import { DocsFilePreview } from "@/docs-core/src/docs-file-preview";
import { FilePreviewTextPane } from "@/file-preview/src/file-preview-text-pane";
import "@/docs-core/src/docs-file-preview.css";
import "@/file-preview/src/file-preview-text-pane.css";
import "@/drive-core/src/drive-browser.css";

const SAMPLE_MARKDOWN = `# Drive preview

This **markdown** document renders with the Docs editor in read-only mode.

- Rich formatting
- Lists and headings
- Same serializer as the Docs workspace
`;

const meta = {
  title: "Docs/DocsFilePreview",
  component: DocsFilePreview,
  parameters: {
    layout: "padded",
  },
  decorators: [
    (Story) => (
      <div className="drive-workspace w-[28rem]">
        <div className="drive-detail-panel__preview relative aspect-[4/3] overflow-hidden">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof DocsFilePreview>;

export default meta;
type Story = StoryObj<typeof DocsFilePreview>;

export const MarkdownReadOnly: Story = {
  name: "Markdown (read-only)",
  args: {
    fileName: "Spec.md",
    content: SAMPLE_MARKDOWN,
    fallback: <FilePreviewTextPane content="Fallback text preview" mode="scrollable" />,
  },
};

export const PlainTextReadOnly: Story = {
  name: "Plain text (read-only)",
  args: {
    fileName: "notes.txt",
    content: "Plain text files use the text serializer without the format bar.",
    fallback: <FilePreviewTextPane content="Fallback text preview" mode="scrollable" />,
  },
};
