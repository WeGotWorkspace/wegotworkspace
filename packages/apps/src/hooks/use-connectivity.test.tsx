import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useConnectivity } from "@/hooks/use-connectivity";
import { readBrowserOnline } from "@/lib/offline/browser-online";

describe("readBrowserOnline", () => {
  it("reflects navigator.onLine when available", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    expect(readBrowserOnline()).toBe(false);

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    expect(readBrowserOnline()).toBe(true);
  });
});

describe("useConnectivity", () => {
  beforeEach(() => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("initializes from navigator.onLine when already offline", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

    const { result } = renderHook(() => useConnectivity());

    expect(result.current.online).toBe(false);
  });

  it("syncs navigator.onLine on mount when the page loads offline", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

    const { result, unmount } = renderHook(() => useConnectivity());

    expect(result.current.online).toBe(false);
    unmount();
  });

  it("updates when the browser fires offline and online events", () => {
    const { result } = renderHook(() => useConnectivity());
    expect(result.current.online).toBe(true);

    act(() => {
      window.dispatchEvent(new Event("offline"));
    });
    expect(result.current.online).toBe(false);

    act(() => {
      window.dispatchEvent(new Event("online"));
    });
    expect(result.current.online).toBe(true);
  });
});
