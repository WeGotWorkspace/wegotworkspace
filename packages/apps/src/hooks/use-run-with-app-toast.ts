import { useCallback } from "react";
import type { AppToastShowOptions } from "@/hooks/use-app-toast";
import { useAppToast } from "@/hooks/use-app-toast";

export type RunWithAppToastOptions =
  | {
      /** Skip success and error Callout toasts; errors are rethrown for caller handling. */
      silent: true;
      mapError?: (err: unknown) => string;
    }
  | {
      silent?: false;
      success: string;
      successOptions?: Omit<AppToastShowOptions, "severity">;
      mapError?: (err: unknown) => string;
    };

/**
 * Runs async work with default {@link useAppToast} success/error Callouts.
 *
 * When **not** `silent`: shows error toast on failure and **resolves with `undefined`**
 * (no rethrow), so callers do not need an empty `try/catch`.
 *
 * When `silent: true`: no toasts; failures **rethrow** for local handling.
 */
export function useRunWithAppToast() {
  const { showSuccess, showError } = useAppToast();

  return useCallback(
    async function runWithAppToast<T>(
      work: () => Promise<T>,
      opts: RunWithAppToastOptions,
    ): Promise<T | undefined> {
      try {
        const data = await work();
        if (opts.silent !== true) {
          showSuccess(opts.success, opts.successOptions);
        }
        return data;
      } catch (err) {
        if (opts.silent === true) {
          throw err;
        }
        const message =
          opts.mapError?.(err) ?? (err instanceof Error ? err.message : "Something went wrong");
        showError(message);
        return undefined;
      }
    },
    [showError, showSuccess],
  );
}
