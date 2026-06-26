import { useMemo } from "react";
import { useParams, useSearch } from "@tanstack/react-router";
import { createWgwShareApiSource } from "@/share-core/src/share-api-source";
import { useShareController } from "@/share-core/src/use-share-controller";
import { ShareWorkspace } from "@/share-core/src/share-workspace";
import type { ShareApiSource } from "@/share-core/src/share-types";

export type ShareAppProps = {
  /** Override the API source for tests/stories; defaults to the live HTTP source. */
  source?: ShareApiSource;
};

/** Route-level public share viewer mounted at `/s/$token` (no auth/workspace shell). */
export function ShareApp({ source }: ShareAppProps = {}) {
  const resolvedSource = useMemo(() => source ?? createWgwShareApiSource(), [source]);
  const params = useParams({ strict: false }) as { token?: string };
  const search = useSearch({ strict: false }) as { invite?: string };
  const token = params.token ?? "";
  const inviteToken = typeof search.invite === "string" && search.invite ? search.invite : null;

  const { state, handlers, accessRequestStatus } = useShareController({
    token,
    inviteToken,
    source: resolvedSource,
  });

  return (
    <ShareWorkspace state={state} handlers={handlers} accessRequestStatus={accessRequestStatus} />
  );
}
