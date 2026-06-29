import { cleanup, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import { useDocumentTitle } from "@/lib/document-title/use-document-title";

describe("useDocumentTitle", () => {
  afterEach(() => {
    cleanup();
    document.title = "WeGotWorkspace";
  });

  it("sets document.title from context", () => {
    renderHook(() => useDocumentTitle("Documents"));
    expect(document.title).toBe("Documents | WeGotWorkspace");
  });

  it("restores the previous title on unmount", () => {
    document.title = "Prior title";
    const { unmount } = renderHook(() => useDocumentTitle("Mail"));
    expect(document.title).toBe("Mail | WeGotWorkspace");
    unmount();
    expect(document.title).toBe("Prior title");
  });

  it("updates when context changes", () => {
    const { rerender } = renderHook(({ title }: { title?: string }) => useDocumentTitle(title), {
      initialProps: { title: "Notes" },
    });
    expect(document.title).toBe("Notes | WeGotWorkspace");
    rerender({ title: "My note" });
    expect(document.title).toBe("My note | WeGotWorkspace");
  });
});
