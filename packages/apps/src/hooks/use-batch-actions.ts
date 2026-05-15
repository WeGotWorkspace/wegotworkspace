import type { DeferredApiWriteArgs } from "@/hooks/use-queued-mutation";

type QueueMutation = (args: DeferredApiWriteArgs) => void;

type RunBatchActionArgs = {
  queueMutation: QueueMutation;
  key: string;
  toastMessage: string;
  execute: (signal: AbortSignal) => Promise<void>;
  rollback: () => void;
  undoToastMessage: string;
};

export function runQueuedBatchAction({
  queueMutation,
  key,
  toastMessage,
  execute,
  rollback,
  undoToastMessage,
}: RunBatchActionArgs) {
  queueMutation({
    key,
    toastMessage,
    execute,
    undo: rollback,
    onError: rollback,
    undoToastMessage,
  });
}
