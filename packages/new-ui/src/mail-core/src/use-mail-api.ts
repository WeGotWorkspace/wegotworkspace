import { useCallback, useMemo } from "react";
import type { MailUIData, MailAPIOperations } from "@/mail-core/src/mail-types";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import { folderTokenFromMailboxLabel } from "@/lib/api/wgw/mail";
import { useLiveBootstrap } from "@/lib/live/use-live-bootstrap";
import { createDefaultMailApiSource, type MailApiSource } from "./mail-api-source";

export function useMailAPI(source?: MailApiSource) {
  const resolvedSource = useMemo(() => source ?? createDefaultMailApiSource(), [source]);
  const livePlaceholder = useMemo<MailUIData>(
    () => ({
      mail: [],
      mailboxes: ["Inbox", "Starred", ...resolvedSource.systemMailboxes].map((label) => ({
        label,
      })),
    }),
    [resolvedSource],
  );
  const loadBootstrap = useCallback(() => resolvedSource.loadBootstrap(), [resolvedSource]);
  const { phase, error, data, load, successVersion } = useLiveBootstrap(loadBootstrap);
  const mailboxLoader = data?.mailboxLoader;
  const resolveFolderToken = useCallback(
    (label: string) =>
      mailboxLoader?.folderTokenForLabel?.(label) ?? folderTokenFromMailboxLabel(label),
    [mailboxLoader],
  );
  const operations = useMemo<MailAPIOperations | undefined>(
    () => resolvedSource.createOperations(mailboxLoader),
    [resolvedSource, mailboxLoader],
  );

  return {
    phase,
    error,
    retry: load,
    successVersion,
    listLoading: phase === "loading",
    session: data?.session ?? mockWorkspaceSession,
    data: data?.data ?? livePlaceholder,
    mailboxLoader,
    systemMailboxes: resolvedSource.systemMailboxes,
    encodeFolderToken: resolveFolderToken,
    operations,
  };
}
