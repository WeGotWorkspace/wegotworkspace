import type { DocsAPIOperations, DocsUIData } from "@/docs-core/src/docs-types";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";

export type DocsWorkspaceProps = {
  data: DocsUIData;
  session: WorkspaceSession;
  operations?: DocsAPIOperations;
  /** Drive API path from route search (`?file=…`). */
  filePath?: string | null;
  /** When true, show offline pending/retry UX for My Drive paths. */
  offlineEnabled?: boolean;
  labels?: Partial<DocsUILabels>;
  onLogout?: () => void;
  /** Called after a successful rename with the new drive API path. */
  onFileRenamed?: (apiPath: string) => void;
  className?: string;
};
