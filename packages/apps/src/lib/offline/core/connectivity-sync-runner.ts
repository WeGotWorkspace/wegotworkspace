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
