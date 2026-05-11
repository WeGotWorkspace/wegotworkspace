import { useCallback, useEffect, useState } from "react";

type LivePhase = "loading" | "ready" | "error";

export function useLiveBootstrap<T>(loadBootstrap: () => Promise<T>) {
  const [phase, setPhase] = useState<LivePhase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<T | null>(null);
  const [successVersion, setSuccessVersion] = useState(0);

  const load = useCallback(() => {
    setPhase("loading");
    setError(null);
    void loadBootstrap()
      .then((next) => {
        setData(next);
        setPhase("ready");
        setSuccessVersion((v) => v + 1);
      })
      .catch((e: unknown) => {
        setData(null);
        setError(e instanceof Error ? e.message : String(e));
        setPhase("error");
      });
  }, [loadBootstrap]);

  useEffect(() => {
    load();
  }, [load]);

  return { phase, error, data, load, successVersion };
}
