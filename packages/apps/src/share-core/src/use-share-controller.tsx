import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { setShareAccessToken } from "@/share-core/src/share-access-store";
import type {
  ShareAccessRequestStatus,
  ShareApiSource,
  ShareWorkspaceHandlers,
  ShareWorkspaceState,
} from "@/share-core/src/share-types";

export type UseShareControllerArgs = {
  token: string;
  inviteToken?: string | null;
  source: ShareApiSource;
};

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export function useShareController({ token, inviteToken, source }: UseShareControllerArgs): {
  state: ShareWorkspaceState;
  handlers: ShareWorkspaceHandlers;
  accessRequestStatus: ShareAccessRequestStatus;
} {
  const operations = useMemo(() => source.createOperations(token), [source, token]);
  const [state, setState] = useState<ShareWorkspaceState>({ phase: "loading" });
  const [accessRequestStatus, setAccessRequestStatus] = useState<ShareAccessRequestStatus>("idle");
  const activeRef = useRef(true);

  const loadMeta = useCallback(async () => {
    setState({ phase: "loading" });
    try {
      const meta = await source.loadMeta(token);
      if (!activeRef.current) return;
      if (meta.permission !== "none") {
        setState({ phase: "viewer", meta, operations });
      } else {
        setState({ phase: "needs-confirmation", meta });
      }
    } catch (error) {
      if (activeRef.current) setState({ phase: "error", message: errorMessage(error) });
    }
  }, [operations, source, token]);

  const confirm = useCallback(
    async (invite: string) => {
      setState({ phase: "confirming" });
      try {
        const result = await source.confirm(invite);
        if (!activeRef.current) return;
        setShareAccessToken(token, result.accessToken);
        setState({ phase: "confirm-success", permission: result.permission });
      } catch (error) {
        if (activeRef.current) setState({ phase: "confirm-error", message: errorMessage(error) });
      }
    },
    [source, token],
  );

  useEffect(() => {
    activeRef.current = true;
    if (inviteToken) {
      void confirm(inviteToken);
    } else {
      void loadMeta();
    }
    return () => {
      activeRef.current = false;
    };
  }, [confirm, inviteToken, loadMeta]);

  const handlers: ShareWorkspaceHandlers = useMemo(
    () => ({
      onRequestAccess: (email: string) => {
        setAccessRequestStatus("sending");
        source
          .requestAccess(token, email)
          .then(() => {
            if (activeRef.current) setAccessRequestStatus("sent");
          })
          .catch(() => {
            if (activeRef.current) setAccessRequestStatus("error");
          });
      },
      onContinue: () => {
        void loadMeta();
      },
      onRetry: () => {
        if (inviteToken && state.phase === "confirm-error") {
          void confirm(inviteToken);
        } else {
          void loadMeta();
        }
      },
    }),
    [confirm, inviteToken, loadMeta, source, state.phase, token],
  );

  return { state, handlers, accessRequestStatus };
}
