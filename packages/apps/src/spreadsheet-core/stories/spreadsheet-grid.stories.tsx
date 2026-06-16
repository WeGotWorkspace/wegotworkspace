import type { Meta, StoryObj } from "@storybook/react-vite";
import { TooltipProvider } from "@/ui/tooltip";
import { SpreadsheetFormulaBar } from "@/spreadsheet-core/src/spreadsheet-formula-bar";
import { SpreadsheetGrid } from "@/spreadsheet-core/src/spreadsheet-grid";
import { SpreadsheetMainPane } from "@/spreadsheet-core/src/spreadsheet-main-pane";
import { useSpreadsheetController } from "@/spreadsheet-core/src/use-spreadsheet-controller";
import { SAMPLE_YCSV } from "@/spreadsheet-core/src/fixtures/sample-sheet";
import "@/spreadsheet-core/src/spreadsheet-workspace.css";

const initialDocument = {
  apiPath: "/users/demo/budget.ycsv",
  fileName: "budget.ycsv",
  content: SAMPLE_YCSV,
};

function GridHarness({ viewSource }: { viewSource: boolean }) {
  const controller = useSpreadsheetController({ filePath: null, initialDocument });
  return (
    <TooltipProvider delayDuration={200}>
      <div className="spreadsheet-workspace" style={{ height: "100vh", display: "flex" }}>
        <div className="spreadsheet-workspace__grid-area">
          <SpreadsheetFormulaBar controller={controller} />
          <div className="spreadsheet-workspace__grid-wrap">
            <SpreadsheetGrid
              rawData={controller.rawData}
              computed={controller.computed}
              columnSettings={controller.columnSettings}
              defs={controller.defs}
              viewOffset={controller.viewOffset}
              active={controller.activeCell}
              onActivateCell={controller.setActiveCell}
              onSelect={controller.setSelection}
              writeCell={controller.writeCell}
              picking={controller.picking}
            />
          </div>
        </div>
        {viewSource ? <SpreadsheetMainPaneShadow /> : null}
      </div>
    </TooltipProvider>
  );
}

/** Keeps the SpreadsheetMainPane surface referenced for catalog coverage. */
function SpreadsheetMainPaneShadow() {
  const controller = useSpreadsheetController({ filePath: null, initialDocument });
  return <SpreadsheetMainPane controller={controller} viewSource />;
}

const meta: Meta<typeof GridHarness> = {
  title: "Apps/Sheets/Grid",
  component: GridHarness,
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof GridHarness>;

export const Grid: Story = {
  tags: ["vitest-ci"],
  args: { viewSource: false },
};

export const WithSource: Story = {
  name: "Source toggle",
  args: { viewSource: true },
};
