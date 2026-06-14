import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import type { ContactsUILabels } from "@/contacts-core/src/contacts-labels";
import type { ContactsAPIOperations, ContactsUIData } from "@/contacts-core/src/contacts-types";

export type ContactsWorkspaceProps = {
  data: ContactsUIData;
  session: WorkspaceSession;
  labels?: Partial<ContactsUILabels>;
  /** Optional async backend operations for contacts mutations. */
  operations?: ContactsAPIOperations;
  /** Show list-column spinner while contacts bootstrap (shell + sidebar visible). */
  listLoading?: boolean;
  /** Invoked when the user chooses log out; navigation is owned by the app shell. */
  onLogout?: () => void;
  className?: string;
};
