import { useCallback, useMemo } from "react";
import { useWorkspaceApi } from "@/hooks/use-workspace-api";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import {
  createDefaultSettingsApiSource,
  type SettingsApiSource,
} from "@/settings-core/src/settings-api-source";
import type { SettingsUIData } from "@/settings-core/src/settings-types";

export function useSettingsAPI(source?: SettingsApiSource) {
  const resolvedSource = useMemo(() => source ?? createDefaultSettingsApiSource(), [source]);
  const placeholderData = useMemo<SettingsUIData>(
    () => ({
      user: { username: "", displayName: "", email: "" },
      groups: [],
      mail: { imapUsername: "", imapHasPassword: false },
      mailServer: {
        imapHost: "",
        imapPort: 0,
        imapSecurity: "",
        smtpHost: "",
        smtpPort: 0,
        smtpSecurity: "",
      },
      logoutUrl: "/",
    }),
    [],
  );
  const loadBootstrapFromSource = useCallback(
    (apiSource: SettingsApiSource) => apiSource.loadBootstrap(),
    [],
  );
  const createOperationsFromSource = useCallback(
    (apiSource: SettingsApiSource) => apiSource.createOperations(),
    [],
  );

  const { phase, error, retry, successVersion, listLoading, session, data, operations } =
    useWorkspaceApi({
      source: resolvedSource,
      createDefaultSource: createDefaultSettingsApiSource,
      placeholderData,
      loadBootstrap: loadBootstrapFromSource,
      createOperations: createOperationsFromSource,
      fallbackSession: mockWorkspaceSession,
    });

  return { phase, error, retry, successVersion, listLoading, session, data, operations };
}
