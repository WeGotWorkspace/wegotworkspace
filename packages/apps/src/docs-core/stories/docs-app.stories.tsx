import type { Meta, StoryObj } from "@storybook/react-vite";
import { createDocsAppBootstrap, createDocsTxtBootstrap } from "@/lib/api/mock/docs-bootstrap";
import { createMockDocsOperations } from "@/docs-core/src/docs-mock-operations";
import { DocsWorkspace } from "@/docs-core/src/docs-workspace";
import "@/docs-core/src/docs-workspace.css";

const meta: Meta<typeof DocsWorkspace> = {
  title: "Apps/Docs",
  component: DocsWorkspace,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof DocsWorkspace>;

const bootstrap = createDocsAppBootstrap();
const mockDocument = bootstrap.data.document!;
const mockOperations = createMockDocsOperations();

export const Default: Story = {
  args: {
    ...bootstrap,
    filePath: mockDocument.apiPath,
    operations: mockOperations,
    onFileRenamed: () => {},
    onLogout: () => {},
  },
};

export const Empty: Story = {
  name: "No document",
  args: {
    ...bootstrap,
    data: { document: null },
    onLogout: () => {},
  },
};

const txtBootstrap = createDocsTxtBootstrap();

export const PlainText: Story = {
  name: "Plain text (.txt)",
  parameters: {
    docs: {
      description: {
        story:
          "Plain `.txt` files use the same Docs layout as markdown; only the formatting toolbar is hidden.",
      },
    },
  },
  args: {
    ...txtBootstrap,
    filePath: txtBootstrap.data.document!.apiPath,
    operations: createMockDocsOperations(),
    onFileRenamed: () => {},
    onLogout: () => {},
  },
};
