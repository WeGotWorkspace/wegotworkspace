import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
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

export const ViewSource: Story = {
  name: "View source",
  tags: ["vitest-ci"],
  args: {
    ...bootstrap,
    filePath: mockDocument.apiPath,
    operations: createMockSpreadsheetOperations(),
    onFileRenamed: () => {},
    onLogout: () => {},
  },
  play: async ({ canvasElement, step }) => {
    const canvas = within(canvasElement);

    await step("Toggle the source view on", async () => {
      const toggle = await canvas.findByRole("button", { name: "Edit source" });
      await userEvent.click(toggle);
    });

    await step("Source pane shows the live serialized YCSV", async () => {
      const source = await canvas.findByRole<HTMLTextAreaElement>("textbox", {
        name: "YCSV source",
      });
      await waitFor(() => {
        expect(source).toBeVisible();
        // The pane must render the live `.ycsv` document, not a blank textarea.
        expect(source.value.length).toBeGreaterThan(0);
        expect(source.value).toContain("ycsv_version: 1");
        expect(source.value).toContain("product,aantal,prijs,totaal,marge");
      });
    });
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
