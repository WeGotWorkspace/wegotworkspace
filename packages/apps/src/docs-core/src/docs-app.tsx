import { useCallback, useMemo } from "react";
import { useNavigate, useSearch } from "@tanstack/react-router";
import { WorkspaceLiveAppShell } from "@/lib/live/workspace-live-app-shell";
import {
  docsApiPathFromSearch,
  docsSearchFromApiPath,
  parseDocsRouteSearch,
} from "@/docs-core/src/docs-route-search";
import type { DocsAppProps } from "@/docs-core/src/docs-app-props";
import { DocsWorkspace } from "@/docs-core/src/docs-workspace";
import { useDocsAPI } from "@/docs-core/src/use-docs-api";

export function DocsApp({ apiSource }: DocsAppProps = {}) {
  const navigate = useNavigate();
  const search = useSearch({ strict: false });
  const { phase, error, retry, successVersion, session, data, operations } = useDocsAPI(apiSource);

  const filePath = useMemo(
    () => docsApiPathFromSearch(parseDocsRouteSearch(search as Record<string, unknown>).file),
    [search],
  );

  const handleLogout = useCallback(() => {
    window.location.assign("/logout");
  }, []);

  const handleFileRenamed = useCallback(
    (apiPath: string) => {
      void navigate({
        to: "/docs",
        search: docsSearchFromApiPath(apiPath),
      });
    },
    [navigate],
  );

  return (
    <WorkspaceLiveAppShell
      phase={phase}
      error={error}
      retry={retry}
      errorTitle="Could not load docs"
      successVersion={successVersion}
      render={(key) => (
        <DocsWorkspace
          key={key}
          data={data}
          session={session}
          operations={operations}
          filePath={filePath}
          onLogout={handleLogout}
          onFileRenamed={handleFileRenamed}
        />
      )}
    />
  );
}
