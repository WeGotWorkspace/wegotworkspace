import { useCallback, useEffect, useRef } from "react";
import { useAppToast } from "@/hooks/use-app-toast";

/** Arguments for a single deferred API write (undo + `AbortSignal` while pending). */
export type DeferredApiWriteArgs = {
  key: string;
  toastMessage: string;
  execute: (signal: AbortSignal) => Promise<void>;
  undo: () => void;
  onError?: () => void;
  undoToastMessage?: string;
};

type PendingMutation = {
  key: string;
  timer: ReturnType<typeof setTimeout> | null;
  toastId: string | number;
  controller: AbortController | null;
  started: boolean;
  cancelledByUndo: boolean;
  undo: () => void;
  undoToastMessage?: string;
};

type UseQueuedMutationOptions = {
  delayMs?: number;
  onMutationError: () => void;
};

/**
 * Queues **deferred** API writes: shows a Callout toast with **Undo**, waits `delayMs`,
 * then runs `execute(AbortSignal)`. Undo clears the timer, aborts the in-flight request
 * if already started, rolls back via `undo`, and shows `undoToastMessage`.
 *
 * Pair with {@link runQueuedBatchAction} for batch helpers, or call `queueMutation` directly.
 */
export function useQueuedMutation({ delayMs = 2500, onMutationError }: UseQueuedMutationOptions) {
  const { show, dismiss } = useAppToast();
  const pendingByKeyRef = useRef<Map<string, PendingMutation>>(new Map());
  const orderRef = useRef<string[]>([]);

  const removePending = useCallback((key: string) => {
    pendingByKeyRef.current.delete(key);
    orderRef.current = orderRef.current.filter((item) => item !== key);
  }, []);

  const showUndoToast = useCallback(
    (message?: string) => {
      show(message ?? "Change undone.", { severity: "info" });
    },
    [show],
  );

  const undoPending = useCallback(
    (entry: PendingMutation, { showToast }: { showToast: boolean }) => {
      if (!pendingByKeyRef.current.has(entry.key)) return false;
      if (entry.timer) clearTimeout(entry.timer);
      entry.cancelledByUndo = true;
      if (entry.controller) entry.controller.abort();
      dismiss(entry.toastId);
      removePending(entry.key);
      entry.undo();
      if (showToast) showUndoToast(entry.undoToastMessage);
      return true;
    },
    [dismiss, removePending, showUndoToast],
  );

  const queueMutation = useCallback(
    ({ key, toastMessage, execute, undo, onError, undoToastMessage }: DeferredApiWriteArgs) => {
      const existing = pendingByKeyRef.current.get(key);
      if (existing) {
        if (existing.timer) clearTimeout(existing.timer);
        dismiss(existing.toastId);
        removePending(key);
      }

      const entry: PendingMutation = {
        key,
        timer: null,
        toastId: "",
        controller: null,
        started: false,
        cancelledByUndo: false,
        undo,
        undoToastMessage,
      };

      entry.timer = setTimeout(() => {
        entry.started = true;
        entry.timer = null;
        entry.controller = new AbortController();
        void execute(entry.controller.signal)
          .catch((error: unknown) => {
            if (entry.cancelledByUndo) return;
            if (error instanceof DOMException && error.name === "AbortError") return;
            (onError ?? undo)();
            onMutationError();
          })
          .finally(() => {
            dismiss(entry.toastId);
            removePending(key);
          });
      }, delayMs);

      entry.toastId =
        show(toastMessage, {
          duration: delayMs + 3500,
          severity: "success",
          canUndo: true,
          undoLabel: "Undo",
          onUndo: () => {
            void undoPending(entry, { showToast: true });
          },
        }) ?? "";

      pendingByKeyRef.current.set(key, entry);
      orderRef.current = [...orderRef.current.filter((item) => item !== key), key];
    },
    [delayMs, dismiss, onMutationError, removePending, show, undoPending],
  );

  const undoLatest = useCallback(() => {
    const latestKey = orderRef.current[orderRef.current.length - 1];
    if (!latestKey) return false;
    const latest = pendingByKeyRef.current.get(latestKey);
    if (!latest) return false;
    return undoPending(latest, { showToast: true });
  }, [undoPending]);

  useEffect(
    () => () => {
      for (const pending of pendingByKeyRef.current.values()) {
        if (pending.timer) clearTimeout(pending.timer);
        if (pending.controller) pending.controller.abort();
        dismiss(pending.toastId);
      }
      pendingByKeyRef.current.clear();
      orderRef.current = [];
    },
    [dismiss],
  );

  return { queueMutation, undoLatest };
}
