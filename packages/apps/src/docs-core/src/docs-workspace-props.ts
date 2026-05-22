import type { DocsAPIOperations, DocsUIData } from "@/docs-core/src/docs-types";
import type { DocsUILabels } from "@/docs-core/src/docs-labels";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";

export type DocsWorkspaceProps = {
  data: DocsUIData;
  session: WorkspaceSession;
  operations?: DocsAPIOperations;
  /** Drive API path from route search (`?file=…`). */
  filePath?: string | null;
  labels?: Partial<DocsUILabels>;
  onLogout?: () => void;
  className?: string;
};
