import { useMemo } from "react";
import { createMailAppBootstrap } from "@/lib/api/mock/mail-bootstrap";
import type { Mail } from "@/types/mail";
import type { MailUIData } from "@/mail-core/src/mail-types";
import { useMailController } from "@/mail-core/src/use-mail-controller";
import { mailStoryLabels } from "@/mail-core/src/mail-app.stories.fixtures";

const STORY_SYSTEM_MAILBOXES = [
  "Inbox",
  "Starred",
  "Sent",
  "Drafts",
  "Spam",
  "Archive",
  "Trash",
] as const;

export type MailPaneStoryHarnessOptions = {
  listLoading?: boolean;
  mailOverride?: Mail[];
  data?: MailUIData;
};

export function useMailPaneStoryController(options?: MailPaneStoryHarnessOptions) {
  const bootstrap = useMemo(() => {
    if (options?.data) {
      return createMailAppBootstrap({ data: options.data });
    }
    const base = createMailAppBootstrap();
    if (options?.mailOverride !== undefined) {
      return createMailAppBootstrap({
        data: { ...base.data, mail: options.mailOverride },
      });
    }
    return base;
  }, [options?.data, options?.mailOverride]);

  return useMailController({
    messages: bootstrap.data.mail,
    mailboxes: bootstrap.data.mailboxes,
    session: bootstrap.session,
    labels: mailStoryLabels,
    listLoading: options?.listLoading ?? false,
    systemMailboxes: STORY_SYSTEM_MAILBOXES,
    operations: undefined,
  });
}
