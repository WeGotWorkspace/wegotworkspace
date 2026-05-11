import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import { mailStoryLabels } from "@/mail-core/src/mail-app.stories.fixtures";
import { useMailAPI } from "@/mail-core/src/use-mail-api";
import { MailWorkspace } from "@/mail-core/src/mail-workspace";

export function MailApp() {
  const navigate = useNavigate();
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

  useEffect(() => {
    if (phase !== "error" || !error) return;
    const message = typeof error === "string" ? error : String(error);
    if (!message.includes("MAIL_SETTINGS_MISSING")) return;
    void navigate({ to: "/settings" });
  }, [error, navigate, phase]);

  return (
    <WorkspaceLiveAppShell
      phase={phase}
      error={error}
      retry={retry}
      errorTitle="Could not load live mail"
      successVersion={successVersion}
      render={(key) => (
        <MailWorkspace
          key={key}
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
      )}
    />
  );
}
