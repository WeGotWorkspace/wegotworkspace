type FlushTask<T> = () => Promise<T>;

/** Serializes flush attempts so a single in-flight sync never overlaps itself. */
export class ConnectivitySyncRunner<T = void> {
  private flushing = false;

  constructor(private readonly flushTask: FlushTask<T>) {}

  flush(): Promise<T | undefined> {
    if (this.flushing) return Promise.resolve(undefined);
    this.flushing = true;
    return this.flushTask()
      .catch(() => undefined)
      .finally(() => {
        this.flushing = false;
      });
  }
}

/** Per-account registry of {@link ConnectivitySyncRunner} instances. */
export class ConnectivitySyncRunnerRegistry<T = void> {
  private readonly runners = new Map<string, ConnectivitySyncRunner<T>>();

  getOrCreate(username: string, flushTask: FlushTask<T>): ConnectivitySyncRunner<T> {
    const existing = this.runners.get(username);
    if (existing) return existing;
    const runner = new ConnectivitySyncRunner(flushTask);
    this.runners.set(username, runner);
    return runner;
  }
}
