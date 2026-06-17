type FlushTask<T> = () => Promise<T>;

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
