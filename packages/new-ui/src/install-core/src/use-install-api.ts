import { useCallback } from "react";
import { useLiveBootstrap } from "@/lib/live/use-live-bootstrap";
import { fetchInstallerBootstrap } from "@/lib/api/wgw/installer";

export function useInstallAPI() {
  const loadBootstrap = useCallback(() => fetchInstallerBootstrap(), []);
  const { phase, error, data, load, successVersion } = useLiveBootstrap(loadBootstrap);
  return {
    phase,
    error,
    retry: load,
    successVersion,
    bootstrap: data,
  };
}
