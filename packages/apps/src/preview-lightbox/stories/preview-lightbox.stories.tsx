import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { FilePreview } from "@/file-preview/src/file-preview";
import { PreviewLightbox } from "@/preview-lightbox/src/preview-lightbox";
import "@/preview-lightbox/src/preview-lightbox.css";
import "@/file-preview/src/file-preview.css";

const SAMPLE_IMAGE =
  "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='240' height='160'%3E%3Crect width='240' height='160' fill='%2310b981'/%3E%3C/svg%3E";

const meta = {
  title: "Shared/PreviewLightbox",
  component: PreviewLightbox,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof PreviewLightbox>;

export default meta;
type Story = StoryObj<typeof PreviewLightbox>;

function LightboxHarness({
  title,
  previewKind,
}: {
  title: string;
  previewKind: "image" | "text" | "unsupported";
}) {
  const [open, setOpen] = useState(true);
  const preview =
    previewKind === "image"
      ? { kind: "blob-url" as const, url: SAMPLE_IMAGE }
      : previewKind === "text"
        ? {
            kind: "text" as const,
            content:
              "This scrollable text pane demonstrates the lightbox body slot.\n\nLine two continues the preview for markdown and plain text files.",
          }
        : { kind: "unsupported" as const };

  return (
    <div className="p-8">
      <button type="button" onClick={() => setOpen(true)}>
        Open preview
      </button>
      <PreviewLightbox
        open={open}
        title={title}
        onClose={() => setOpen(false)}
        onPrevious={() => {}}
        onNext={() => {}}
        hasPrevious
        hasNext
      >
        <FilePreview
          fileKind={previewKind === "image" ? "image" : "doc"}
          fileName={title}
          preview={preview}
          textMode="scrollable"
          mediaClassName="mx-auto max-h-[min(70vh,40rem)] w-full object-contain"
          fallbackClassName="mx-auto flex size-24 items-center justify-center opacity-60"
          videoControls
        />
      </PreviewLightbox>
    </div>
  );
}

export const ImagePreview: Story = {
  name: "Image preview",
  render: () => <LightboxHarness title="cover.png" previewKind="image" />,
};

export const TextPreview: Story = {
  name: "Text preview",
  render: () => <LightboxHarness title="Roadmap.md" previewKind="text" />,
};

export const UnsupportedFallback: Story = {
  name: "Unsupported fallback",
  render: () => <LightboxHarness title="report.pdf" previewKind="unsupported" />,
};

export const Closed: Story = {
  name: "Closed (hidden)",
  render: () => (
    <PreviewLightbox open={false} title="Hidden" onClose={() => {}}>
      <p>Not visible</p>
    </PreviewLightbox>
  ),
};
