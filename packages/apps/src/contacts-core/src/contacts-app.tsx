import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import type { ContactsApiSource } from "@/contacts-core/src/contacts-api-source";
import { ContactsWorkspace } from "@/contacts-core/src/contacts-workspace";
import { useContactsAPI } from "@/contacts-core/src/use-contacts-api";

export type ContactsAppProps = {
  /** When set (e.g. Storybook live story), bypasses `wgwLiveApiEnabled()` routing. */
  apiSource?: ContactsApiSource;
};

export function ContactsApp({ apiSource }: ContactsAppProps = {}) {
  const navigate = useNavigate();
  const { phase, error, retry, successVersion, listLoading, data, session, operations } =
    useContactsAPI(apiSource);

  useEffect(() => {
    if (phase !== "error" || !error) return;
    const message = typeof error === "string" ? error : String(error);
    if (!message.includes("CONTACTS_SETTINGS_MISSING")) return;
    void navigate({ to: "/settings" });
  }, [error, navigate, phase]);

  return (
    <WorkspaceLiveAppShell
      phase={phase}
      error={error}
      retry={retry}
      errorTitle="Could not load live contacts"
      successVersion={successVersion}
      render={(key) => (
        <ContactsWorkspace
          key={key}
          data={data}
          session={session}
          operations={operations}
          listLoading={listLoading}
          onLogout={() => {
            window.location.assign("/logout");
          }}
        />
      )}
    />
  );
}
