import { useCallback, useMemo } from "react";
import { useLiveBootstrap } from "@/lib/live/use-live-bootstrap";
import { fetchInstallerBootstrap } from "@/lib/api/wgw/installer";
import type { InstallUIData } from "@/install-core/src/install-types";

export function useInstallAPI() {
  const loadBootstrap = useCallback(() => fetchInstallerBootstrap(), []);
  const { phase, error, data, load, successVersion } = useLiveBootstrap(loadBootstrap);
  const installData = useMemo<InstallUIData>(
    () => ({ state: data?.state ?? null }),
    [data?.state],
  );

  return {
    phase,
    error,
    retry: load,
    successVersion,
    data: installData,
  };
}
