import { useCallback, useEffect, useState } from "react";

type HybridPhase = "loading" | "ready" | "error";

export function useHybridBootstrap<T>({
  load,
  readCache,
}: {
  load: () => Promise<T>;
  readCache: () => Promise<T | null>;
}) {
  const [phase, setPhase] = useState<HybridPhase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [successVersion, setSuccessVersion] = useState(0);

  const applySuccess = useCallback((next: T) => {
    setData(next);
    setPhase("ready");
    setError(null);
    setSuccessVersion((v) => v + 1);
  }, []);

  const run = useCallback(() => {
    setPhase("loading");
    setError(null);
    void load()
      .then(applySuccess)
      .catch((e: unknown) => {
        setData(null);
        setError(e instanceof Error ? e.message : String(e));
        setPhase("error");
      });
  }, [applySuccess, load]);

  useEffect(() => {
    let cancelled = false;
    void readCache().then((cached) => {
      if (cancelled) return;
      if (cached) {
        applySuccess(cached);
        if (typeof navigator !== "undefined" && navigator.onLine) {
          void load()
            .then((next) => {
              if (!cancelled) applySuccess(next);
            })
            .catch(() => undefined);
        }
        return;
      }
      run();
    });
    return () => {
      cancelled = true;
    };
  }, [applySuccess, load, readCache, run]);

  const patchBootstrap = useCallback((updater: (prev: T | null) => T | null) => {
    setData(updater);
  }, []);

  return { phase, error, data, load: run, successVersion, patchBootstrap };
}
