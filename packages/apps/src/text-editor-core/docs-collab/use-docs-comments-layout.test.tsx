import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DOCS_COMMENTS_COMPACT_MIN,
  docsCommentsLayoutMediaQueries,
  resolveDocsCommentsLayoutMode,
  shouldAutoOpenCommentsForDraft,
  shouldAutoOpenCommentsForThreads,
  shouldDefaultCommentsOpen,
  useDocsCommentsLayout,
} from "./use-docs-comments-layout";

function mockMatchMedia(width: number) {
  const queries = docsCommentsLayoutMediaQueries();
  const listeners = new Map<string, Set<() => void>>();

  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation((query: string) => {
      const matches =
        query === queries.drawer
          ? width < DOCS_COMMENTS_COMPACT_MIN
          : query === queries.sidebar
            ? width >= DOCS_COMMENTS_COMPACT_MIN
            : false;

      if (!listeners.has(query)) {
        listeners.set(query, new Set());
      }

      return {
        matches,
        media: query,
        onchange: null,
        addEventListener: (_event: string, listener: () => void) => {
          listeners.get(query)?.add(listener);
        },
        removeEventListener: (_event: string, listener: () => void) => {
          listeners.get(query)?.delete(listener);
        },
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      };
    }),
  );

  vi.stubGlobal("innerWidth", width);

  return {
    setWidth(nextWidth: number) {
      width = nextWidth;
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: nextWidth,
      });
      for (const queryListeners of listeners.values()) {
        for (const listener of queryListeners) {
          listener();
        }
      }
    },
  };
}

describe("resolveDocsCommentsLayoutMode", () => {
  it("returns drawer below the compact breakpoint", () => {
    expect(resolveDocsCommentsLayoutMode(1159)).toBe("drawer");
    expect(resolveDocsCommentsLayoutMode(320)).toBe("drawer");
  });

  it("returns sidebar at and above the compact breakpoint", () => {
    expect(resolveDocsCommentsLayoutMode(1160)).toBe("sidebar");
    expect(resolveDocsCommentsLayoutMode(1300)).toBe("sidebar");
    expect(resolveDocsCommentsLayoutMode(1920)).toBe("sidebar");
  });
});

describe("shouldDefaultCommentsOpen", () => {
  it("defaults closed on drawer tier and open on sidebar tier", () => {
    expect(shouldDefaultCommentsOpen("drawer")).toBe(false);
    expect(shouldDefaultCommentsOpen("sidebar")).toBe(true);
  });

  it("drawer tier with existing threads still defaults closed on load", () => {
    const layout = resolveDocsCommentsLayoutMode(1159);
    expect(layout).toBe("drawer");
    expect(shouldDefaultCommentsOpen(layout)).toBe(false);
    expect(shouldAutoOpenCommentsForThreads(layout)).toBe(false);
  });
});

describe("shouldAutoOpenCommentsForDraft", () => {
  it("auto-opens for any layout tier when a draft exists", () => {
    const draft = { id: "draft-1" };
    expect(shouldAutoOpenCommentsForDraft(null)).toBe(false);
    expect(shouldAutoOpenCommentsForDraft(draft)).toBe(true);
  });
});

describe("shouldAutoOpenCommentsForThreads", () => {
  it("skips auto-open on drawer tier", () => {
    expect(shouldAutoOpenCommentsForThreads("drawer")).toBe(false);
    expect(shouldAutoOpenCommentsForThreads("sidebar")).toBe(true);
  });
});

describe("useDocsCommentsLayout", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("initializes from the current viewport width", () => {
    mockMatchMedia(1300);
    const { result } = renderHook(() => useDocsCommentsLayout());
    expect(result.current).toBe("sidebar");
  });

  it("updates when the viewport crosses breakpoints", () => {
    const media = mockMatchMedia(1472);
    const { result } = renderHook(() => useDocsCommentsLayout());
    expect(result.current).toBe("sidebar");

    act(() => {
      media.setWidth(1100);
    });
    expect(result.current).toBe("drawer");

    act(() => {
      media.setWidth(1600);
    });
    expect(result.current).toBe("sidebar");
  });
});
