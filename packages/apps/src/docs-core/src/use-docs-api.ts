import { useCallback, useMemo } from "react";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import { useHybridBootstrap } from "@/lib/live/use-hybrid-bootstrap";
import type { DocsAppBootstrap, DocsUIData } from "@/docs-core/src/docs-types";
import { createDefaultDocsApiSource, type DocsApiSource } from "@/docs-core/src/docs-api-source";

const DOCS_BOOTSTRAP_CACHE_KEY = "wgw.docs.bootstrap.session";

function readCachedDocsBootstrap(): DocsAppBootstrap | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(DOCS_BOOTSTRAP_CACHE_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw) as DocsAppBootstrap["session"];
    return { session, data: { document: null } };
  } catch {
    return null;
  }
}

function cacheDocsBootstrap(bootstrap: DocsAppBootstrap): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(DOCS_BOOTSTRAP_CACHE_KEY, JSON.stringify(bootstrap.session));
  } catch {
    // Ignore cache write failures (private mode/quota).
  }
}

export function useDocsAPI(source?: DocsApiSource) {
  const resolvedSource = useMemo(() => source ?? createDefaultDocsApiSource(), [source]);
  const placeholderData = useMemo<DocsUIData>(() => ({ document: null }), []);

  const runBootstrap = useCallback(async () => {
    const bootstrap = await resolvedSource.loadBootstrap();
    cacheDocsBootstrap(bootstrap);
    return bootstrap;
  }, [resolvedSource]);
  const readCache = useCallback(async () => readCachedDocsBootstrap(), []);

  const { phase, error, data, load, successVersion } = useHybridBootstrap({
    load: runBootstrap,
    readCache,
  });

  const networkOperations = useMemo(
    () => resolvedSource.createNetworkOperations(),
    [resolvedSource],
  );

  return {
    phase,
    error,
    retry: load,
    successVersion,
    session: data?.session ?? mockWorkspaceSession,
    data: data?.data ?? placeholderData,
    networkOperations,
  };
}
