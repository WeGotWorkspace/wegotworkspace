import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DOCS_COMMENTS_CENTERED_SHEET_MIN_WIDTH,
  DOCS_COMMENTS_COMPACT_MIN,
  docsCommentsLayoutMediaQueries,
  resolveDocsCommentsLayoutMode,
  shouldApplyCommentsSheetCompact,
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
          : query === queries.marginCompact
            ? width >= DOCS_COMMENTS_COMPACT_MIN && width < DOCS_COMMENTS_CENTERED_SHEET_MIN_WIDTH
            : query === queries.marginWide
              ? width >= DOCS_COMMENTS_CENTERED_SHEET_MIN_WIDTH
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

  it("returns margin-compact between compact and centered breakpoints", () => {
    expect(resolveDocsCommentsLayoutMode(1160)).toBe("margin-compact");
    expect(resolveDocsCommentsLayoutMode(1300)).toBe("margin-compact");
    expect(resolveDocsCommentsLayoutMode(1471)).toBe("margin-compact");
  });

  it("returns margin-wide at and above the centered sheet breakpoint", () => {
    expect(resolveDocsCommentsLayoutMode(1472)).toBe("margin-wide");
    expect(resolveDocsCommentsLayoutMode(1920)).toBe("margin-wide");
  });
});

describe("shouldApplyCommentsSheetCompact", () => {
  it("applies compact sheet shift only when comments are open in the compact tier", () => {
    expect(shouldApplyCommentsSheetCompact("margin-compact", true)).toBe(true);
    expect(shouldApplyCommentsSheetCompact("margin-compact", false)).toBe(false);
    expect(shouldApplyCommentsSheetCompact("margin-wide", true)).toBe(false);
    expect(shouldApplyCommentsSheetCompact("drawer", true)).toBe(false);
  });
});

describe("shouldDefaultCommentsOpen", () => {
  it("defaults closed on drawer tier and open on margin tiers", () => {
    expect(shouldDefaultCommentsOpen("drawer")).toBe(false);
    expect(shouldDefaultCommentsOpen("margin-compact")).toBe(true);
    expect(shouldDefaultCommentsOpen("margin-wide")).toBe(true);
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
    expect(shouldAutoOpenCommentsForThreads("margin-compact")).toBe(true);
    expect(shouldAutoOpenCommentsForThreads("margin-wide")).toBe(true);
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
    expect(result.current).toBe("margin-compact");
  });

  it("updates when the viewport crosses breakpoints", () => {
    const media = mockMatchMedia(1472);
    const { result } = renderHook(() => useDocsCommentsLayout());
    expect(result.current).toBe("margin-wide");

    act(() => {
      media.setWidth(1300);
    });
    expect(result.current).toBe("margin-compact");

    act(() => {
      media.setWidth(1100);
    });
    expect(result.current).toBe("drawer");

    act(() => {
      media.setWidth(1600);
    });
    expect(result.current).toBe("margin-wide");
  });
});
