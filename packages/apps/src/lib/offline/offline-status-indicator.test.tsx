import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultOfflineLabels } from "@/lib/offline/offline-labels";
import { OfflineStatusIndicator } from "@/lib/offline/offline-status-indicator";

describe("OfflineStatusIndicator", () => {
  beforeEach(() => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("renders nothing when online", () => {
    const { container } = render(<OfflineStatusIndicator online />);
    expect(container.firstChild).toBeNull();
  });

  it("renders status pill when offline", () => {
    render(<OfflineStatusIndicator online={false} />);

    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toContain(defaultOfflineLabels.statusMessage);
  });

  it("supports a custom message", () => {
    render(<OfflineStatusIndicator online={false} message="Working offline" />);
    expect(screen.getByRole("status").textContent).toContain("Working offline");
  });

  it("shows on first render when navigator.onLine is already false", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

    render(<OfflineStatusIndicator />);

    expect(screen.getByRole("status")).toBeTruthy();
  });

  it("shows after reachability probe when navigator.onLine is stale", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    render(<OfflineStatusIndicator />);

    await waitFor(() => {
      expect(screen.getByRole("status")).toBeTruthy();
    });
  });
});
