import { useCallback, useMemo } from "react";
import type { MailUIData, MailAPIOperations } from "@/mail-core/src/mail-types";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import { folderTokenFromMailboxLabel } from "@/lib/api/wgw/mail";
import { useWorkspaceApi } from "@/hooks/use-workspace-api";
import { createDefaultMailApiSource, type MailApiSource } from "./mail-api-source";

export function useMailAPI(source?: MailApiSource) {
  const resolvedSource = useMemo(() => source ?? createDefaultMailApiSource(), [source]);
  const placeholderData = useMemo<MailUIData>(
    () => ({
      mail: [],
      mailboxes: ["Inbox", "Starred", ...resolvedSource.systemMailboxes].map((label) => ({
        label,
      })),
    }),
    [resolvedSource.systemMailboxes],
  );
  const { phase, error, retry, successVersion, listLoading, session, data, operations, bootstrap } =
    useWorkspaceApi({
      source: resolvedSource,
      createDefaultSource: createDefaultMailApiSource,
      placeholderData,
      loadBootstrap: (apiSource) => apiSource.loadBootstrap(),
      createOperations: (apiSource, bootstrapData) =>
        apiSource.createOperations(bootstrapData?.mailboxLoader),
      fallbackSession: mockWorkspaceSession,
    });
  const mailboxLoader = bootstrap?.mailboxLoader;
  const resolveFolderToken = useCallback(
    (label: string) =>
      mailboxLoader?.folderTokenForLabel?.(label) ?? folderTokenFromMailboxLabel(label),
    [mailboxLoader],
  );
  const typedOperations = operations as MailAPIOperations | undefined;

  return {
    phase,
    error,
    retry,
    successVersion,
    listLoading,
    session,
    data,
    mailboxLoader,
    systemMailboxes: resolvedSource.systemMailboxes,
    encodeFolderToken: resolveFolderToken,
    operations: typedOperations,
  };
}
