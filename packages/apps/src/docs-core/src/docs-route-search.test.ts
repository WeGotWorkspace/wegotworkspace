/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  docsHrefFromApiPath,
  docsSearchFromApiPath,
  openDocsFileInNewWindow,
} from "@/docs-core/src/docs-route-search";

describe("docs-route-search open helpers", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("docsHrefFromApiPath builds a /docs?file= query from an api path", () => {
    expect(docsHrefFromApiPath("/users/alice/Roadmap.md")).toBe(
      "/docs?file=users%2Falice%2FRoadmap.md",
    );
    expect(docsHrefFromApiPath("users/alice/Roadmap.md")).toBe(
      "/docs?file=users%2Falice%2FRoadmap.md",
    );
  });

  it("openDocsFileInNewWindow opens the editor href in a new tab", () => {
    const popup = { closed: false } as Window;
    const open = vi.spyOn(window, "open").mockReturnValue(popup);

    const result = openDocsFileInNewWindow("/users/alice/Roadmap.md");

    expect(result).toBe(popup);
    expect(open).toHaveBeenCalledWith(
      docsHrefFromApiPath("/users/alice/Roadmap.md"),
      "_blank",
      "noopener,noreferrer",
    );
    expect(docsSearchFromApiPath("/users/alice/Roadmap.md")).toEqual({
      file: "users/alice/Roadmap.md",
    });
  });
});
