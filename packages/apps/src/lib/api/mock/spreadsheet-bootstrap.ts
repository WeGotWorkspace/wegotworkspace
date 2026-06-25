import { SAMPLE_YCSV } from "@/spreadsheet-core/src/fixtures/sample-sheet";
import type { SpreadsheetAppBootstrap } from "@/spreadsheet-core/src/spreadsheet-types";
import { mockWorkspaceSession } from "./workspace-session-mock";

export function createSpreadsheetAppBootstrap(
  overrides?: Partial<SpreadsheetAppBootstrap>,
): SpreadsheetAppBootstrap {
  return {
    session: overrides?.session ?? mockWorkspaceSession,
    data: overrides?.data ?? {
      document: {
        apiPath: "/users/demo/budget.ycsv",
        fileName: "budget.ycsv",
        content: SAMPLE_YCSV,
      },
    },
  };
}
