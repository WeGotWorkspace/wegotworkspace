import { createMockMailSeedData } from "@/lib/api/mock/mail-seed";
import type { MailUIData, MailMailboxLoader } from "@/mail-core/src/mail-types";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";

import { mockWorkspaceSession } from "./workspace-session-mock";

export type MailAppBootstrap = {
  data: MailUIData;
  session: WorkspaceSession;
  mailboxLoader?: MailMailboxLoader;
};

/** Session + mailbox payload only — UI copy lives in story fixtures. */
export function createMailAppBootstrap(overrides?: {
  data?: MailUIData;
  session?: WorkspaceSession;
  mailboxLoader?: MailMailboxLoader;
}): MailAppBootstrap {
  return {
    data: overrides?.data ?? createMockMailSeedData(),
    session: overrides?.session ?? mockWorkspaceSession,
    mailboxLoader: overrides?.mailboxLoader,
  };
}
