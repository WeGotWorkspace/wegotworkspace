/**
 * X2T Converter with Web Worker Support
 */

import { getX2tBaseUrl } from "./utils";
import { X2tConvertParams, X2tConvertResult } from "./types";

interface PendingMessage {
  resolve: (value: any) => void;
  reject: (error: Error) => void;
}

interface WorkerResponse {
  id: number;
  type: string;
  payload?: any;
  error?: string;
}

export class X2tConverter {
  private worker: Worker | null = null;
  private initPromise: Promise<void> | null = null;
  private messageId = 0;
  private pendingMessages = new Map<number, PendingMessage>();
  private x2tWasmResolve: (() => void) | null = null;
  private x2tWasmReject: ((e: Error) => void) | null = null;
  private wasmInitTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (globalThis.Worker) {
      void this.init();
    }
  }

  private getNextId(): number {
    return ++this.messageId;
  }

  private sendMessage<T>(type: string, payload?: any): Promise<T> {
    return new Promise((resolve, reject) => {
      if (!this.worker) {
        reject(new Error("Worker not initialized"));
        return;
      }

      const id = this.getNextId();
      this.pendingMessages.set(id, { resolve, reject });

      if (type === "convert" && payload?.data instanceof ArrayBuffer) {
        this.worker.postMessage({ id, type, payload }, [payload.data]);
      } else {
        this.worker.postMessage({ id, type, payload });
      }
    });
  }

  private handleWorkerMessage = (event: MessageEvent<WorkerResponse>) => {
    const d = event.data as {
      id?: number;
      type?: string;
      payload?: any;
      error?: string;
    };
    const { id, type, payload, error } = d;

    if (type === "__sabre_x2t_ready") {
      if (this.wasmInitTimer) {
        clearTimeout(this.wasmInitTimer);
        this.wasmInitTimer = null;
      }
      this.x2tWasmResolve?.();
      this.x2tWasmResolve = null;
      this.x2tWasmReject = null;
      return;
    }
    if (type === "__sabre_x2t_error") {
      if (this.wasmInitTimer) {
        clearTimeout(this.wasmInitTimer);
        this.wasmInitTimer = null;
      }
      const err = new Error((d as { error?: string }).error || "x2t init failed");
      this.x2tWasmReject?.(err);
      this.x2tWasmResolve = null;
      this.x2tWasmReject = null;
      return;
    }

    if (type === "ready") {
      console.log("[X2tConverter] Worker ready");
      return;
    }

    if (id === undefined) {
      return;
    }

    const pending = this.pendingMessages.get(id);
    if (!pending) {
      return;
    }

    this.pendingMessages.delete(id);

    if (type === "error") {
      pending.reject(new Error(error || "Unknown worker error"));
    } else {
      pending.resolve(payload);
    }
  };

  private handleWorkerError = (error: ErrorEvent) => {
    console.error("[X2tConverter] Worker error:", error);

    for (const [id, pending] of this.pendingMessages) {
      pending.reject(new Error(`Worker error: ${error.message}`));
      this.pendingMessages.delete(id);
    }
    if (this.wasmInitTimer) {
      clearTimeout(this.wasmInitTimer);
      this.wasmInitTimer = null;
    }
    this.x2tWasmReject?.(new Error(error.message || "Worker error"));
    this.x2tWasmResolve = null;
    this.x2tWasmReject = null;
  };

  public init(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise<void>((resolve, reject) => {
      try {
        this.worker = new Worker(new URL("./x2t.worker.ts", import.meta.url));
        this.worker.onmessage = this.handleWorkerMessage;
        this.worker.onerror = this.handleWorkerError;

        const baseUrl = getX2tBaseUrl();
        if (!baseUrl) {
          this.initPromise = null;
          reject(new Error("getX2tBaseUrl() returned empty (not in browser?)"));
          return;
        }

        this.x2tWasmResolve = () => resolve();
        this.x2tWasmReject = (e: Error) => {
          this.initPromise = null;
          reject(e);
        };

        this.wasmInitTimer = setTimeout(() => {
          this.wasmInitTimer = null;
          this.x2tWasmReject?.(new Error("x2t wasm init timeout (60s)"));
          this.x2tWasmResolve = null;
          this.x2tWasmReject = null;
        }, 60000);

        this.worker.postMessage({ type: "__sabre_x2t_init", baseUrl });

        console.log("[X2tConverter] Worker created");
      } catch (err) {
        this.initPromise = null;
        reject(err);
      }
    });

    return this.initPromise;
  }

  public async convert({
    data,
    fileFrom,
    fileTo,
    media,
    fonts,
    themes,
  }: X2tConvertParams): Promise<X2tConvertResult> {
    await this.init();

    const cloneMap = (map?: { [key: string]: Uint8Array }) => {
      if (!map) {
        return undefined;
      }
      return Object.fromEntries(
        Object.entries(map).map(([key, value]) => [key, value.slice(0)]),
      );
    };

    const dataClone = data.slice(0);

    const payload = {
      data: dataClone,
      fileFrom,
      fileTo,
      media: cloneMap(media),
      fonts: cloneMap(fonts),
      themes: cloneMap(themes),
    };
    return this.sendMessage<X2tConvertResult>("convert", payload);
  }

  public terminate(): void {
    if (this.worker) {
      for (const [id, pending] of this.pendingMessages) {
        pending.reject(new Error("Worker terminated"));
        this.pendingMessages.delete(id);
      }

      this.worker.terminate();
      this.worker = null;
      this.initPromise = null;
      if (this.wasmInitTimer) {
        clearTimeout(this.wasmInitTimer);
        this.wasmInitTimer = null;
      }
      console.log("[X2tConverter] Worker terminated");
    }
  }

  public get isInitialized(): boolean {
    return this.worker !== null && this.initPromise !== null;
  }
}

export const converter = new X2tConverter();
