import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearch } from "@tanstack/react-router";
import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import {
  resolveConflictKeepLocal,
  resolveConflictUseServer,
} from "@/lib/offline/contacts-conflict-resolution";
import { resolveContactsOfflineUsername } from "@/lib/offline/offline-session";
import type { ContactsApiSource } from "@/contacts-core/src/contacts-api-source";
import { ContactsConflictDialog } from "@/contacts-core/src/contacts-conflict-dialog";
import { contactDisplayName } from "@/contacts-core/src/contacts-display-utils";
import { defaultContactsLabels } from "@/contacts-core/src/contacts-labels";
import type { ContactCard } from "@/contacts-core/src/contacts-types";
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

  const handleContactChangeRef = useRef<(contactId: string) => void>(() => undefined);
  const cardsRef = useRef<ContactCard[]>([]);

  // Conflicted card ids awaiting a "Keep mine / Use server" decision, resolved
  // one at a time. TODO(#206): replace this binary choice with a field-level merge UI.
  const [conflictQueue, setConflictQueue] = useState<string[]>([]);
  const [resolvingConflict, setResolvingConflict] = useState(false);

  const handleSyncConflict = useCallback((cardIds: string[]) => {
    setConflictQueue((prev) => {
      const next = [...prev];
      for (const id of cardIds) {
        if (!next.includes(id)) next.push(id);
      }
      return next;
    });
  }, []);

  const {
    phase,
    error,
    retry,
    successVersion,
    listLoading,
    refreshList,
    data,
    session,
    operations,
  } = useContactsAPI(apiSource, { onSyncConflict: handleSyncConflict });

  cardsRef.current = data.cards;

  const offlineUsername = resolveContactsOfflineUsername(session.user.username);
  const activeConflictId = conflictQueue[0] ?? null;
  const activeConflictCard = activeConflictId
    ? cardsRef.current.find((c) => c.id === activeConflictId)
    : undefined;
  const activeConflictName = activeConflictCard
    ? contactDisplayName(activeConflictCard)
    : (activeConflictId ?? "");

  const dismissActiveConflict = useCallback(() => {
    setConflictQueue((prev) => prev.slice(1));
  }, []);

  const resolveActiveConflict = useCallback(
    (mode: "local" | "server") => {
      if (!activeConflictId || !offlineUsername) {
        dismissActiveConflict();
        return;
      }
      const cardId = activeConflictId;
      const username = offlineUsername;
      setResolvingConflict(true);
      void (async () => {
        try {
          if (mode === "local") {
            await resolveConflictKeepLocal(username, cardId);
          } else {
            await resolveConflictUseServer(username, cardId);
          }
        } catch {
          // Resolution best-effort; the refresh below re-reads the latest state.
        } finally {
          setResolvingConflict(false);
          dismissActiveConflict();
          refreshList();
        }
      })();
    },
    [activeConflictId, offlineUsername, dismissActiveConflict, refreshList],
  );

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

  useEffect(() => {
    currentViewRef.current = initialView;
  }, [initialView]);

  useEffect(() => {
    currentContactRef.current = initialContactId;
  }, [initialContactId]);

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

  handleContactChangeRef.current = handleContactChange;

  return (
    <>
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
            onRefreshList={refreshList}
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
      <ContactsConflictDialog
        open={activeConflictId !== null}
        contactName={activeConflictName}
        remainingCount={Math.max(conflictQueue.length - 1, 0)}
        busy={resolvingConflict}
        labels={defaultContactsLabels}
        onKeepLocal={() => resolveActiveConflict("local")}
        onUseServer={() => resolveActiveConflict("server")}
        onOpenChange={(open) => {
          if (!open && !resolvingConflict) dismissActiveConflict();
        }}
      />
    </>
  );
}
