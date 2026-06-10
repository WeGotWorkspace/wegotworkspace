import { useCallback, useMemo } from "react";
import type { MailUIData, MailAPIOperations } from "@/mail-core/src/mail-types";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import { folderTokenFromMailboxLabel } from "@/lib/mail/folder-token";
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
  const loadBootstrapFromSource = useCallback(
    (apiSource: MailApiSource) => apiSource.loadBootstrap(),
    [],
  );
  const createOperationsFromSource = useCallback(
    (
      apiSource: MailApiSource,
      bootstrapData?: Awaited<ReturnType<MailApiSource["loadBootstrap"]>>,
    ) => apiSource.createOperations(bootstrapData?.mailboxLoader),
    [],
  );
  const { phase, error, retry, successVersion, listLoading, session, data, operations, bootstrap } =
    useWorkspaceApi({
      source: resolvedSource,
      createDefaultSource: createDefaultMailApiSource,
      placeholderData,
      loadBootstrap: loadBootstrapFromSource,
      createOperations: createOperationsFromSource,
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
