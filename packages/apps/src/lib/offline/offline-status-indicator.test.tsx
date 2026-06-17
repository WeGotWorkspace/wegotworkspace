import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { defaultOfflineLabels } from "@/lib/offline/offline-labels";
import { OfflineStatusIndicator } from "@/lib/offline/offline-status-indicator";

describe("OfflineStatusIndicator", () => {
  afterEach(() => {
    cleanup();
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
});
