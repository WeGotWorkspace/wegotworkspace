export const spreadsheetLabels = {
  toastSaved: "Spreadsheet saved",
  emptyTitle: "No spreadsheet open",
  emptyDescription: "Open a .ycsv file from Drive to start editing.",
  loadError: "Could not load this spreadsheet.",
  saveError: "Could not save this spreadsheet.",
  renameError: "Could not rename this spreadsheet.",
  parseError: "This source has a YCSV syntax error; the grid shows the last valid state.",
  viewSource: "Edit source",
  hideSource: "Hide source",
  statsColumns: (count: number) =>
    `${count.toLocaleString()} ${count === 1 ? "column" : "columns"}`,
  statsRows: (count: number) => `${count.toLocaleString()} ${count === 1 ? "row" : "rows"}`,
  rename: "Rename",
  renameDialogTitle: "Rename spreadsheet",
  renameDialogDescription: "Change the name; the file extension cannot be edited.",
  renameAction: "Rename",
  cancel: "Cancel",
  sidebarSheets: "Sheets",
  sheetsEmpty: "No sheets in this workbook yet.",
  formulaBarPlaceholder: "Type a value or =FORMULA(…)",
  pickingHint: "click cells to insert",
  selectionCells: (count: number) => `${count} cells selected`,
  selectionRows: (count: number) => `${count} rows selected`,
  selectionColumns: (count: number) => `${count} columns selected`,
} as const;

export type SpreadsheetUILabels = typeof spreadsheetLabels;

export function mergeSpreadsheetLabels(
  overrides?: Partial<SpreadsheetUILabels>,
): SpreadsheetUILabels {
  return { ...spreadsheetLabels, ...overrides };
}
