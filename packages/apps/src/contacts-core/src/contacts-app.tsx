import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import type { ContactsApiSource } from "@/contacts-core/src/contacts-api-source";
import { ContactsWorkspace } from "@/contacts-core/src/contacts-workspace";
import { useContactsAPI } from "@/contacts-core/src/use-contacts-api";
import {
  contactsContactFromParams,
  contactsViewFromParams,
} from "@/contacts-core/src/contacts-route-search";

export type ContactsAppProps = {
  /** When set (e.g. Storybook live story), bypasses `wgwLiveApiEnabled()` routing. */
  apiSource?: ContactsApiSource;
};

export function ContactsApp({ apiSource }: ContactsAppProps = {}) {
  const navigate = useNavigate();
  const params = useParams({ strict: false }) as { groupCardId?: string; contactId?: string };
  const rawSearch = useSearch({ strict: false }) as Record<string, unknown>;

  const { phase, error, retry, successVersion, listLoading, data, session, operations } =
    useContactsAPI(apiSource);

  // Backward compat: redirect legacy query-param URLs (?view=&contact=) to new path form.
  // Runs once on mount; if no legacy params are present this is a no-op.
  useEffect(() => {
    const legacyView = typeof rawSearch.view === "string" ? rawSearch.view.trim() : "";
    const legacyContact = typeof rawSearch.contact === "string" ? rawSearch.contact.trim() : "";
    if (!legacyView && !legacyContact) return;

    if (legacyView.startsWith("group:") && legacyContact) {
      const groupId = legacyView.slice("group:".length);
      void navigate({
        to: "/contacts/groups/$groupCardId/$contactId",
        params: { groupCardId: groupId, contactId: legacyContact },
        replace: true,
      });
    } else if (legacyView.startsWith("group:")) {
      const groupId = legacyView.slice("group:".length);
      void navigate({
        to: "/contacts/groups/$groupCardId",
        params: { groupCardId: groupId },
        replace: true,
      });
    } else if (legacyContact) {
      void navigate({
        to: "/contacts/all/$contactId",
        params: { contactId: legacyContact },
        replace: true,
      });
    } else {
      void navigate({ to: "/contacts/all", replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (phase !== "error" || !error) return;
    const message = typeof error === "string" ? error : String(error);
    if (!message.includes("CONTACTS_SETTINGS_MISSING")) return;
    void navigate({ to: "/settings" });
  }, [error, navigate, phase]);

  const initialView = useMemo(() => contactsViewFromParams(params), [params]);
  const initialContactId = useMemo(() => contactsContactFromParams(params), [params]);

  // Refs track the latest view/contact for URL construction inside callbacks,
  // avoiding stale-closure issues without adding reactive dependencies.
  const currentViewRef = useRef<string>(initialView);
  const currentContactRef = useRef<string>(initialContactId);

  const handleViewChange = useCallback(
    (view: string) => {
      currentViewRef.current = view;
      currentContactRef.current = "";
      if (view.startsWith("group:")) {
        const groupId = view.slice("group:".length);
        void navigate({
          to: "/contacts/groups/$groupCardId",
          params: { groupCardId: groupId },
          replace: true,
        });
      } else {
        void navigate({ to: "/contacts/all", replace: true });
      }
    },
    [navigate],
  );

  const handleContactChange = useCallback(
    (contactId: string) => {
      currentContactRef.current = contactId;
      const view = currentViewRef.current;
      if (!contactId) {
        if (view.startsWith("group:")) {
          const groupId = view.slice("group:".length);
          void navigate({
            to: "/contacts/groups/$groupCardId",
            params: { groupCardId: groupId },
            replace: true,
          });
        } else {
          void navigate({ to: "/contacts/all", replace: true });
        }
      } else {
        if (view.startsWith("group:")) {
          const groupId = view.slice("group:".length);
          void navigate({
            to: "/contacts/groups/$groupCardId/$contactId",
            params: { groupCardId: groupId, contactId },
            replace: true,
          });
        } else {
          void navigate({
            to: "/contacts/all/$contactId",
            params: { contactId },
            replace: true,
          });
        }
      }
    },
    [navigate],
  );

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
          initialView={initialView}
          initialContactId={initialContactId}
          onViewChange={handleViewChange}
          onContactChange={handleContactChange}
          onLogout={() => {
            window.location.assign("/logout");
          }}
        />
      )}
    />
  );
}
