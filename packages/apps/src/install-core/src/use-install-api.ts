import { useCallback, useMemo } from "react";
import { useLiveBootstrap } from "@/lib/live/use-live-bootstrap";
import {
  createDefaultInstallApiSource,
  type InstallApiSource,
} from "@/install-core/src/install-api-source";
import type { InstallAPIOperations, InstallUIData } from "@/install-core/src/install-types";

type InstallBootstrap = {
  data: InstallUIData;
  operations?: InstallAPIOperations;
};

export function useInstallAPI(source?: InstallApiSource) {
  const resolvedSource = useMemo(() => source ?? createDefaultInstallApiSource(), [source]);
  const loadBootstrap = useCallback(async (): Promise<InstallBootstrap> => {
    const data = await resolvedSource.loadBootstrap();
    return {
      data,
      operations: resolvedSource.createOperations(data),
    };
  }, [resolvedSource]);

  const { phase, error, data, load, successVersion } = useLiveBootstrap(loadBootstrap);
  const placeholderData = useMemo<InstallUIData>(() => ({ state: null }), []);

  return {
    phase,
    error,
    retry: load,
    successVersion,
    data: data?.data ?? placeholderData,
    operations: data?.operations,
  };
}
