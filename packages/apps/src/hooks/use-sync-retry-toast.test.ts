/** @vitest-environment jsdom */
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { AppToastShowOptions } from "@/hooks/use-app-toast";
import { useSyncRetryToast } from "@/hooks/use-sync-retry-toast";

const show = vi.fn<(title: string, options?: AppToastShowOptions) => string | number>(
  () => "toast-1",
);
const dismiss = vi.fn();

vi.mock("@/hooks/use-app-toast", () => ({
  useAppToast: () => ({ show, dismiss }),
}));

describe("useSyncRetryToast", () => {
  beforeEach(() => {
    show.mockClear();
    dismiss.mockClear();
  });
  it("shows a persistent retry toast while active", () => {
    const onRetry = vi.fn();
    const { rerender, unmount } = renderHook(
      ({ active }) =>
        useSyncRetryToast({
          active,
          title: "Some changes could not sync",
          message: "Your edits are saved locally.",
          retryLabel: "Retry",
          onRetry,
        }),
      { initialProps: { active: false } },
    );

    expect(show).not.toHaveBeenCalled();

    rerender({ active: true });
    expect(show).toHaveBeenCalledWith(
      "Some changes could not sync",
      expect.objectContaining({
        severity: "error",
        description: "Your edits are saved locally.",
        canRetry: true,
        retryLabel: "Retry",
        duration: Number.POSITIVE_INFINITY,
      }),
    );

    rerender({ active: false });
    expect(dismiss).toHaveBeenCalledWith("toast-1");

    unmount();
  });

  it("calls onRetry and dismisses when retry is clicked", () => {
    const onRetry = vi.fn();
    renderHook(() =>
      useSyncRetryToast({
        active: true,
        title: "Sync failed",
        retryLabel: "Retry",
        onRetry,
      }),
    );

    const options = show.mock.calls[0]?.[1];
    act(() => {
      options?.onRetry?.();
    });

    expect(onRetry).toHaveBeenCalledOnce();
    expect(dismiss).toHaveBeenCalledWith("toast-1");
  });
});
