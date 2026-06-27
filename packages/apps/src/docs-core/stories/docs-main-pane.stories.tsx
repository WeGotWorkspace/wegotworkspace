import { useMemo, useState } from "react";
import type { Editor } from "@tiptap/react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { TooltipProvider } from "@/ui/tooltip";
import { createDocsAppBootstrap, createDocsTxtBootstrap } from "@/lib/api/mock/docs-bootstrap";
import type { DocsAppBootstrap } from "@/docs-core/src/docs-types";
import { createMockDocsOperations } from "@/docs-core/src/docs-mock-operations";
import { DocsMainPane } from "@/docs-core/src/docs-main-pane";
import type { TextEditorPageFormat } from "@/text-editor-core/src/text-editor-pagination";
import { useDocsController } from "@/docs-core/src/use-docs-controller";
import "@/docs-core/src/docs-workspace.css";

const PARAGRAPH =
  "WeGotWorkspace keeps documents in plain Markdown on disk, while the editor layers a Letter-sized sheet on top for a print-ready writing surface. Visual pagination is a presentation concern only — page breaks are computed at runtime from ProseMirror decorations and never alter the stored content, so the same file opens identically in the source view or on another collaborator's screen.";

function longSection(index: number): string {
  return [
    `## Section ${index}: drafting in long form`,
    "",
    PARAGRAPH,
    "",
    `Pagination should flow naturally across page boundaries. ${PARAGRAPH}`,
    "",
    "- Headings, lists, and quotes split cleanly between pages.",
    "- Page numbers render in each footer.",
    "- The cream gutter mirrors the surrounding workspace canvas.",
    "",
    "> Great writing is iteration. Capture thinking, then sharpen it together.",
    "",
    PARAGRAPH,
    "",
  ].join("\n");
}

const PAGINATION_FIGURE_SVG = `data:image/svg+xml;utf8,${encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" width="520" height="200"><rect width="520" height="200" fill="#e8eefc"/><rect x="16" y="16" width="488" height="168" fill="none" stroke="#3b82f6" stroke-width="2"/><text x="260" y="108" font-family="sans-serif" font-size="22" fill="#1e3a8a" text-anchor="middle">Figure 1 — page layout</text></svg>',
)}`;

const LONG_DOCS_MARKDOWN = [
  "# Multi-page product brief",
  "",
  "This document is intentionally long so the Docs editor renders several visual pages. It exercises headings, paragraphs, lists, a table, and an image across page breaks.",
  "",
  longSection(1),
  longSection(2),
  "### Quarterly status",
  "",
  "| Quarter | Revenue | Status   |",
  "| ------- | ------- | -------- |",
  "| Q1      | $120k   | On track |",
  "| Q2      | $148k   | Ahead    |",
  "| Q3      | $171k   | On track |",
  "| Q4      | $205k   | At risk  |",
  "",
  `![Figure 1 — page layout](${PAGINATION_FIGURE_SVG})`,
  "",
  longSection(3),
  longSection(4),
  longSection(5),
].join("\n");

function DocsMainPaneHarness({
  bootstrap,
  viewSource = false,
}: {
  bootstrap: DocsAppBootstrap;
  viewSource?: boolean;
}) {
  const operations = useMemo(() => createMockDocsOperations(), []);
  const controller = useDocsController({
    filePath: bootstrap.data.document?.apiPath ?? null,
    operations,
    initialDocument: bootstrap.data.document,
  });
  const fileKey = bootstrap.data.document?.apiPath ?? "empty";
  const [, setEditor] = useState<Editor | null>(null);

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="docs-workspace"
        style={{
          minHeight: "100dvh",
          backgroundColor: "var(--color-cream, #ffffff)",
        }}
      >
        <div className="docs-workspace__editor mx-auto max-w-3xl px-6 py-10 md:px-12 md:py-16">
          <DocsMainPane
            controller={controller}
            fileKey={fileKey}
            viewSource={viewSource}
            onEditorReady={setEditor}
          />
        </div>
      </div>
    </TooltipProvider>
  );
}

function DocsPaginatedHarness({
  bootstrap,
  initialPageFormat,
}: {
  bootstrap: DocsAppBootstrap;
  initialPageFormat?: TextEditorPageFormat;
}) {
  const operations = useMemo(() => createMockDocsOperations(), []);
  const controller = useDocsController({
    filePath: bootstrap.data.document?.apiPath ?? null,
    operations,
    initialDocument: bootstrap.data.document,
  });
  const fileKey = bootstrap.data.document?.apiPath ?? "empty";
  const [, setEditor] = useState<Editor | null>(null);

  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="docs-workspace flex flex-col"
        style={{ height: "100dvh", backgroundColor: "var(--docs-surface)" }}
      >
        <DocsMainPane
          controller={controller}
          fileKey={fileKey}
          viewSource={false}
          onEditorReady={setEditor}
          initialPageFormat={initialPageFormat}
        />
      </div>
    </TooltipProvider>
  );
}

const PAGINATED_BOOTSTRAP = createDocsAppBootstrap({
  data: {
    document: {
      apiPath: "/users/demo/multi-page-brief.md",
      fileName: "multi-page-brief.md",
      content: LONG_DOCS_MARKDOWN,
    },
  },
});

const meta = {
  title: "Apps/Docs/Panes/Main",
  component: DocsMainPane,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof DocsMainPane>;

export default meta;
type Story = StoryObj<typeof DocsMainPane>;

export const Default: Story = {
  tags: ["vitest-ci"],
  render: () => <DocsMainPaneHarness bootstrap={createDocsAppBootstrap()} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(
      await canvas.findByRole("heading", { name: "Product brief", level: 1 }),
    ).toBeInTheDocument();
    await expect(canvas.getByText("Discovery notes")).toBeInTheDocument();
    await expect(canvas.getByText("Approve table layout")).toBeInTheDocument();
  },
};

export const PlainText: Story = {
  render: () => <DocsMainPaneHarness bootstrap={createDocsTxtBootstrap()} />,
};

export const Empty: Story = {
  render: () => (
    <DocsMainPaneHarness bootstrap={createDocsAppBootstrap({ data: { document: null } })} />
  ),
};

export const ViewSource: Story = {
  render: () => <DocsMainPaneHarness bootstrap={createDocsAppBootstrap()} viewSource />,
};

/**
 * Long-form document showing visual multi-page pagination on the cream canvas,
 * defaulting to A4. The footer (bottom-right) carries the runtime page-size
 * picker — switching re-flows pagination live without touching the content.
 *
 * Untagged (no `vitest-ci`): pagination measures layout at runtime, so this is
 * a manual/visual smoke story rather than a deterministic interaction test.
 */
export const Paginated: Story = {
  render: () => <DocsPaginatedHarness bootstrap={PAGINATED_BOOTSTRAP} />,
};

/**
 * Same document with the page-size picker initialized to US Letter, so the
 * A4 (default) vs Letter geometry can be compared side by side. Untagged for
 * the same runtime-measurement reason as {@link Paginated}.
 */
export const PaginatedLetter: Story = {
  render: () => <DocsPaginatedHarness bootstrap={PAGINATED_BOOTSTRAP} initialPageFormat="letter" />,
};
