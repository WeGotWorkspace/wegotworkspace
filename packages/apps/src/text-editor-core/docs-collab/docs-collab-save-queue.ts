export const SAVE_DELAY_MS = 2000;
export const SAVE_RETRY_MAX_MS = 30000;

export type SaveQueueState = {
  localDirtySinceLastSave: boolean;
  pendingServerSave: boolean;
  lastSuccessfulSaveSignature: string | null;
  saveRetryMs: number;
  nextSaveAttemptAt: number;
};

export type ShouldPersistResult = {
  shouldPersist: boolean;
  signatureChanged: boolean;
  clearLocalDirty: boolean;
  clearPendingWhenUnchanged: boolean;
};

export function computeShouldPersist(
  markdown: string,
  signature: string,
  state: Pick<
    SaveQueueState,
    "localDirtySinceLastSave" | "pendingServerSave" | "lastSuccessfulSaveSignature"
  >,
): ShouldPersistResult {
  const signatureChanged = signature !== state.lastSuccessfulSaveSignature;
  const shouldPersist =
    (state.localDirtySinceLastSave || state.pendingServerSave) && signatureChanged;
  return {
    shouldPersist,
    signatureChanged,
    clearLocalDirty: !shouldPersist,
    clearPendingWhenUnchanged: !shouldPersist && state.pendingServerSave && !signatureChanged,
  };
}

export function computeNextRetryMs(currentRetryMs: number): number {
  return Math.min(Math.max(currentRetryMs || SAVE_DELAY_MS, SAVE_DELAY_MS) * 2, SAVE_RETRY_MAX_MS);
}

export function computeSaveDelayMs(
  nextSaveAttemptAt: number,
  now = Date.now(),
  saveDelayMs = SAVE_DELAY_MS,
): number {
  const retryDelayMs = Math.max(nextSaveAttemptAt - now, 0);
  return Math.max(saveDelayMs, retryDelayMs);
}

export function shouldMarkPendingWhenUnsaved(
  localDirtySinceLastSave: boolean,
  signature: string,
  lastSuccessfulSaveSignature: string | null,
): boolean {
  if (!localDirtySinceLastSave) return false;
  return signature !== lastSuccessfulSaveSignature;
}

export function createInitialSaveQueueState(): SaveQueueState {
  return {
    localDirtySinceLastSave: false,
    pendingServerSave: false,
    lastSuccessfulSaveSignature: null,
    saveRetryMs: 0,
    nextSaveAttemptAt: 0,
  };
}

export function saveSuccessState(signature: string): Partial<SaveQueueState> {
  return {
    localDirtySinceLastSave: false,
    lastSuccessfulSaveSignature: signature,
    saveRetryMs: 0,
    nextSaveAttemptAt: 0,
  };
}

export function saveFailureState(
  currentRetryMs: number,
  now = Date.now(),
): Partial<SaveQueueState> {
  const nextRetryMs = computeNextRetryMs(currentRetryMs);
  return {
    saveRetryMs: nextRetryMs,
    nextSaveAttemptAt: now + nextRetryMs,
  };
}
