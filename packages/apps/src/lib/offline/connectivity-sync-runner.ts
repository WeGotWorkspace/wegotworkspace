import { useOnReconnect } from "@/hooks/use-connectivity";

type FlushTask = () => Promise<void>;

export class ConnectivitySyncRunner {
  private flushing = false;

  constructor(private readonly flushTask: FlushTask) {}

  flush(): Promise<void> {
    if (this.flushing) return Promise.resolve();
    this.flushing = true;
    return this.flushTask()
      .catch(() => undefined)
      .finally(() => {
        this.flushing = false;
      });
  }
}

export function useConnectivitySyncRunner(runner: ConnectivitySyncRunner): void {
  useOnReconnect(() => {
    void runner.flush();
  });
}
