import type { Meta, StoryObj } from "@storybook/react-vite";
import { createSpreadsheetAppBootstrap } from "@/lib/api/mock/spreadsheet-bootstrap";
import { createMockSpreadsheetOperations } from "@/spreadsheet-core/src/spreadsheet-mock-operations";
import { SpreadsheetWorkspace } from "@/spreadsheet-core/src/spreadsheet-workspace";
import "@/spreadsheet-core/src/spreadsheet-workspace.css";

const meta: Meta<typeof SpreadsheetWorkspace> = {
  title: "Apps/Sheets",
  component: SpreadsheetWorkspace,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof SpreadsheetWorkspace>;

const bootstrap = createSpreadsheetAppBootstrap();
const mockDocument = bootstrap.data.document!;

export const Default: Story = {
  tags: ["vitest-ci"],
  args: {
    ...bootstrap,
    filePath: mockDocument.apiPath,
    operations: createMockSpreadsheetOperations(),
    onFileRenamed: () => {},
    onLogout: () => {},
  },
};

export const Empty: Story = {
  name: "No spreadsheet",
  args: {
    ...bootstrap,
    data: { document: null },
    onLogout: () => {},
  },
};
