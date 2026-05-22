import type { Meta, StoryObj } from "@storybook/react-vite";
import { createDocsAppBootstrap } from "@/lib/api/mock/docs-bootstrap";
import { DocsWorkspace } from "@/docs-core/src/docs-workspace";

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

export const Default: Story = {
  args: {
    ...bootstrap,
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
