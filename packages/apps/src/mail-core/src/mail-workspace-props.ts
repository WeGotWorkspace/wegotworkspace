import type {
  MailboxSummary,
  MailMailboxLoader,
  MailAPIOperations,
} from "@/mail-core/src/mail-types";
import type { MailUILabels } from "@/mail-core/src/mail-app.stories.fixtures";
import type { Mail } from "@/types/mail";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";

export type MailWorkspaceProps = {
  messages: Mail[];
  mailboxes: MailboxSummary[];
  session: WorkspaceSession;
  labels?: Partial<MailUILabels>;
  /** Show list-column spinner while folders/messages bootstrap (shell + sidebar already visible). */
  listLoading?: boolean;
  /** System mailbox labels shown in sidebar Mailboxes section. */
  systemMailboxes?: readonly string[];
  /** Encode mailbox display label to API folder token. */
  encodeFolderToken?: (label: string) => string;
  /** Optional mailbox loader for lazy page fetches. */
  mailboxLoader?: MailMailboxLoader;
  /** Optional async backend operations for mail mutations and compose flows. */
  operations?: MailAPIOperations;
  /** Invoked when the user chooses log out; navigation is owned by the app shell. */
  onLogout?: () => void;
  className?: string;
};
