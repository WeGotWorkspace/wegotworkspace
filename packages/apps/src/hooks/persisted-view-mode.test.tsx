import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DOCS_VIEW_MODE_STORAGE_KEY,
  DRIVE_VIEW_MODE_STORAGE_KEY,
  parseViewMode,
  readPersistedViewMode,
  writePersistedViewMode,
} from "@/hooks/persisted-view-mode";
import { usePersistedViewMode } from "@/hooks/use-persisted-view-mode";

function clearStorage(): void {
  if (typeof window !== "undefined" && window.localStorage) {
    window.localStorage.clear();
  }
}

describe("parseViewMode", () => {
  it("returns grid or list when valid", () => {
    expect(parseViewMode("grid", "list")).toBe("grid");
    expect(parseViewMode("list", "grid")).toBe("list");
  });

  it("falls back for missing, corrupt, or invalid values", () => {
    expect(parseViewMode(null, "grid")).toBe("grid");
    expect(parseViewMode("", "list")).toBe("list");
    expect(parseViewMode("table", "grid")).toBe("grid");
    expect(parseViewMode("GRID", "list")).toBe("list");
  });
});

describe("readPersistedViewMode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    clearStorage();
  });

  it("reads stored value when valid", () => {
    window.localStorage.setItem(DRIVE_VIEW_MODE_STORAGE_KEY, "list");
    expect(readPersistedViewMode(DRIVE_VIEW_MODE_STORAGE_KEY, "grid")).toBe("list");
  });

  it("falls back when stored value is invalid", () => {
    window.localStorage.setItem(DOCS_VIEW_MODE_STORAGE_KEY, "cards");
    expect(readPersistedViewMode(DOCS_VIEW_MODE_STORAGE_KEY, "list")).toBe("list");
  });

  it("falls back when localStorage throws", () => {
    vi.spyOn(window.localStorage, "getItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(readPersistedViewMode(DRIVE_VIEW_MODE_STORAGE_KEY, "grid")).toBe("grid");
  });

  it("returns fallback without touching storage when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    expect(readPersistedViewMode(DRIVE_VIEW_MODE_STORAGE_KEY, "list")).toBe("list");
  });
});

describe("writePersistedViewMode", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    clearStorage();
  });

  it("persists grid and list values", () => {
    writePersistedViewMode(DRIVE_VIEW_MODE_STORAGE_KEY, "list");
    expect(window.localStorage.getItem(DRIVE_VIEW_MODE_STORAGE_KEY)).toBe("list");

    writePersistedViewMode(DRIVE_VIEW_MODE_STORAGE_KEY, "grid");
    expect(window.localStorage.getItem(DRIVE_VIEW_MODE_STORAGE_KEY)).toBe("grid");
  });

  it("swallows storage write failures", () => {
    vi.spyOn(window.localStorage, "setItem").mockImplementation(() => {
      throw new Error("quota exceeded");
    });
    expect(() => writePersistedViewMode(DOCS_VIEW_MODE_STORAGE_KEY, "grid")).not.toThrow();
  });

  it("no-ops when window is undefined", () => {
    vi.stubGlobal("window", undefined);
    expect(() => writePersistedViewMode(DOCS_VIEW_MODE_STORAGE_KEY, "list")).not.toThrow();
  });
});

describe("usePersistedViewMode", () => {
  afterEach(() => {
    clearStorage();
  });

  it("initializes from storage and writes updates", () => {
    window.localStorage.setItem(DRIVE_VIEW_MODE_STORAGE_KEY, "list");

    const { result } = renderHook(() =>
      usePersistedViewMode({
        storageKey: DRIVE_VIEW_MODE_STORAGE_KEY,
        defaultMode: "grid",
      }),
    );

    expect(result.current[0]).toBe("list");

    act(() => {
      result.current[1]("grid");
    });

    expect(result.current[0]).toBe("grid");
    expect(window.localStorage.getItem(DRIVE_VIEW_MODE_STORAGE_KEY)).toBe("grid");
  });
});
