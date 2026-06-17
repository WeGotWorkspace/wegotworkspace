import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useConnectivity } from "@/hooks/use-connectivity";
import {
  getConnectivitySnapshot,
  probeBrowserReachable,
  readBrowserOnline,
  subscribeBrowserOnline,
} from "@/lib/offline/browser-online";

describe("readBrowserOnline", () => {
  it("reflects navigator.onLine when available", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    expect(readBrowserOnline()).toBe(false);

    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    expect(readBrowserOnline()).toBe(true);
  });
});

describe("subscribeBrowserOnline", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("notifies with the current navigator.onLine value on subscribe", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const onStoreChange = vi.fn();

    const unsubscribe = subscribeBrowserOnline(onStoreChange);

    expect(onStoreChange).toHaveBeenCalled();
    expect(getConnectivitySnapshot()).toBe(false);
    unsubscribe();
  });

  it("fires store change on offline and online events", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
    const onStoreChange = vi.fn();
    const unsubscribe = subscribeBrowserOnline(onStoreChange);

    expect(getConnectivitySnapshot()).toBe(true);

    window.dispatchEvent(new Event("offline"));
    expect(getConnectivitySnapshot()).toBe(false);

    window.dispatchEvent(new Event("online"));
    expect(getConnectivitySnapshot()).toBe(true);

    unsubscribe();
  });
});

describe("probeBrowserReachable", () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("returns false without fetching when navigator.onLine is false", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(probeBrowserReachable()).resolves.toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns false when a same-origin HEAD request fails with a network error", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    await expect(probeBrowserReachable()).resolves.toBe(false);
  });
});

describe("useConnectivity", () => {
  let unmountHook: (() => void) | undefined;

  beforeEach(() => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
  });

  afterEach(() => {
    unmountHook?.();
    unmountHook = undefined;
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("initializes from navigator.onLine when already offline", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

    const { result, unmount } = renderHook(() => useConnectivity());
    unmountHook = unmount;

    expect(result.current.online).toBe(false);
  });

  it("syncs navigator.onLine on mount when the page loads offline", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

    const { result, unmount } = renderHook(() => useConnectivity());
    unmountHook = unmount;

    expect(result.current.online).toBe(false);
  });

  it("detects offline via reachability probe when navigator.onLine is stale", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const { result, unmount } = renderHook(() => useConnectivity());
    unmountHook = unmount;

    expect(result.current.online).toBe(true);

    await waitFor(() => {
      expect(result.current.online).toBe(false);
    });
  });

  it("updates when the browser fires offline and online events", () => {
    const { result, unmount } = renderHook(() => useConnectivity());
    unmountHook = unmount;
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
