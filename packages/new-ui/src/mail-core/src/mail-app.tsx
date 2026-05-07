import { LiveBootstrapErrorPanel } from "@/lib/live/live-bootstrap-error-panel";
import { mailStoryLabels } from "@/mail-core/src/mail-app.stories.fixtures";
import { useMailAPI } from "@/mail-core/src/use-mail-api";
import { MailWorkspace } from "@/mail-core/src/mail-workspace";

export function MailApp() {
  const {
    phase,
    error,
    retry,
    successVersion,
    listLoading,
    data,
    mailboxLoader,
    session,
    systemMailboxes,
    encodeFolderToken,
    operations,
  } = useMailAPI();

  if (phase === "error") {
    return (
      <LiveBootstrapErrorPanel title="Could not load live mail" error={error} onRetry={retry} />
    );
  }

  return (
    <MailWorkspace
      key={successVersion}
      messages={data.mail}
      mailboxes={data.mailboxes}
      mailboxLoader={mailboxLoader}
      session={session}
      labels={mailStoryLabels}
      listLoading={listLoading}
      systemMailboxes={systemMailboxes}
      encodeFolderToken={encodeFolderToken}
      operations={operations}
    />
  );
}
