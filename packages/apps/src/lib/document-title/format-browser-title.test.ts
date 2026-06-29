import { describe, expect, it } from "vitest";
import { formatBrowserTitle } from "@/lib/document-title/format-browser-title";

describe("formatBrowserTitle", () => {
  it("returns brand only when context is missing or blank", () => {
    expect(formatBrowserTitle()).toBe("WeGotWorkspace");
    expect(formatBrowserTitle("")).toBe("WeGotWorkspace");
    expect(formatBrowserTitle("   ")).toBe("WeGotWorkspace");
  });

  it("formats context with brand suffix", () => {
    expect(formatBrowserTitle("Documents")).toBe("Documents | WeGotWorkspace");
    expect(formatBrowserTitle("  Inbox  ")).toBe("Inbox | WeGotWorkspace");
  });
});
