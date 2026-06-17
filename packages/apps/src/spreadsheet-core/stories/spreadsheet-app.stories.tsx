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

export const InCellEditing: Story = {
  name: "In-cell editing",
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
    // Glide's overlay editor renders into #portal on document.body, outside the story root.
    const doc = canvasElement.ownerDocument;
    const findCellInput = () =>
      waitFor(() => {
        const el = doc.querySelector<HTMLInputElement>(".spreadsheet-cell-editor__input");
        if (!el)
          throw new Error("in-cell editor did not open (Glide #portal mount point missing?)");
        return el;
      });

    await step("Activating a cell opens the in-cell editor", async () => {
      // Click the first data cell on the canvas, then Enter to edit. This opens
      // Glide's overlay editor, which renders into #portal — the mount point that
      // was missing, breaking all in-cell editing.
      const gridCanvas = await canvas.findByTestId("data-grid-canvas");
      const rect = gridCanvas.getBoundingClientRect();
      const clientX = rect.left + 100;
      const clientY = rect.top + 55;
      const opts = { bubbles: true, cancelable: true, clientX, clientY, button: 0 };
      gridCanvas.dispatchEvent(new PointerEvent("pointerdown", { ...opts, pointerId: 1 }));
      gridCanvas.dispatchEvent(new MouseEvent("mousedown", opts));
      gridCanvas.dispatchEvent(new PointerEvent("pointerup", { ...opts, pointerId: 1 }));
      gridCanvas.dispatchEvent(new MouseEvent("mouseup", opts));
      gridCanvas.dispatchEvent(new MouseEvent("click", opts));
      gridCanvas.focus();
      await userEvent.keyboard("{Enter}");
      const input = await findCellInput();
      await userEvent.clear(input);
      await userEvent.type(input, "Pears");
      await userEvent.keyboard("{Enter}");
    });

    await step("The edit is written back to the workbook", async () => {
      await userEvent.click(await canvas.findByRole("button", { name: "Edit source" }));
      const source = await canvas.findByRole<HTMLTextAreaElement>("textbox", {
        name: "YCSV source",
      });
      await waitFor(() => {
        expect(source.value).toContain("Pears,6,0.45");
      });
    });
  },
};

export const SheetStats: Story = {
  name: "Sheet stats footer",
  tags: ["vitest-ci"],
  args: {
    ...bootstrap,
    filePath: mockDocument.apiPath,
    operations: createMockSpreadsheetOperations(),
    onFileRenamed: () => {},
    onLogout: () => {},
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    // The sample sheet has 5 columns and 5 data rows (header excluded).
    await waitFor(() => {
      expect(canvas.getByText("5 columns")).toBeInTheDocument();
      expect(canvas.getByText("5 rows")).toBeInTheDocument();
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
