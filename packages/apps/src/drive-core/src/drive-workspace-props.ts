import type { ViewKey } from "@/drive-core/src/drive-models";
import type { DriveAPIOperations, DriveUIData } from "@/drive-core/src/drive-types";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";

export type DriveWorkspaceProps = {
  data: DriveUIData;
  session: WorkspaceSession;
  operations?: DriveAPIOperations;
  listLoading?: boolean;
  /** When set with {@link onViewChange}, view is controlled by the host (e.g. URL). */
  view?: ViewKey;
  /** Emitted when the user navigates; host should update routing. */
  onViewChange?: (view: ViewKey) => void;
  /** Opens a Markdown file in the Docs app (host implements routing). */
  onOpenDocsFile?: (apiPath: string) => void;
  /** Opens a `.ycsv` file in the Spreadsheet app (host implements routing). */
  onOpenSpreadsheetFile?: (apiPath: string) => void;
  /** Same-tab navigation for plugin editor routes (host implements routing). */
  onNavigate?: (href: string) => void;
  onLogout?: () => void;
  className?: string;
};
