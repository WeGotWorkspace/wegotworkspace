import { createContext, useContext } from "react";
import type { ColumnSetting, Defs } from "@/spreadsheet-core/src/ycsv/ycsv";

/**
 * Editor context for the in-cell formula editor. Replaces the original
 * module-level global so multiple grids never share mutable state.
 */
export type SpreadsheetGridContextValue = {
  defs: Defs;
  columnSettings: ColumnSetting[];
};

const SpreadsheetGridContext = createContext<SpreadsheetGridContextValue>({
  defs: {},
  columnSettings: [],
});

export const SpreadsheetGridProvider = SpreadsheetGridContext.Provider;

export function useSpreadsheetGridContext(): SpreadsheetGridContextValue {
  return useContext(SpreadsheetGridContext);
}
