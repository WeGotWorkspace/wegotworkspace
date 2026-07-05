import type { Meta, StoryObj } from "@storybook/react-vite";
import { FilePreview } from "@/file-preview/src/file-preview";
import "@/file-preview/src/file-preview.css";
import "@/drive-core/src/drive-browser.css";

const SAMPLE_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='80'%3E%3Crect width='120' height='80' fill='%2322c55e'/%3E%3C/svg%3E";

const meta = {
  title: "Shared/FilePreview",
  component: FilePreview,
  parameters: {
    layout: "centered",
  },
  decorators: [
    (Story) => (
      <div className="drive-workspace w-64">
        <div className="drive-file-tile__preview relative">
          <Story />
        </div>
      </div>
    ),
  ],
} satisfies Meta<typeof FilePreview>;

export default meta;
type Story = StoryObj<typeof FilePreview>;

export const ImageBlobUrl: Story = {
  name: "Image (blob URL)",
  args: {
    fileKind: "image",
    fileName: "cover.png",
    preview: { kind: "blob-url", url: SAMPLE_IMAGE },
    mediaClassName: "h-full w-full object-cover",
  },
};

export const VideoBlobUrl: Story = {
  name: "Video (blob URL, muted tile)",
  args: {
    fileKind: "video",
    fileName: "clip.mp4",
    preview: {
      kind: "blob-url",
      url: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
    },
    mediaClassName: "h-full w-full object-cover",
  },
};

export const TextExcerpt: Story = {
  name: "Text excerpt (tile)",
  args: {
    fileKind: "doc",
    fileName: "Roadmap.md",
    preview: {
      kind: "text",
      content:
        "Q3 goals include offline docs, shared previews, and a faster search index rollout across all workspaces.",
    },
    textMode: "clamped",
  },
};

export const UnsupportedFallback: Story = {
  name: "Unsupported (icon fallback)",
  args: {
    fileKind: "doc",
    fileName: "report.pdf",
    preview: { kind: "unsupported" },
  },
};

export const EmptyFallback: Story = {
  name: "Empty / loading fallback",
  args: {
    fileKind: "doc",
    fileName: "draft.md",
  },
};

export const DetailPaneScrollable: Story = {
  name: "Detail pane (scrollable text)",
  decorators: [
    (Story) => (
      <div className="drive-workspace w-80">
        <div className="drive-detail-panel__preview">
          <Story />
        </div>
      </div>
    ),
  ],
  args: {
    fileKind: "doc",
    fileName: "Spec.md",
    preview: {
      kind: "text",
      content:
        "Line one of the document.\nLine two continues the preview body.\nLine three shows scrollable pane mode for detail and future lightbox surfaces.",
    },
    textMode: "scrollable",
  },
};
