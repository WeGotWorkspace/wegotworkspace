/** @vitest-environment jsdom */
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { DriveFile } from "@/drive-core/src/drive-models";
import type { DriveAPIOperations } from "@/drive-core/src/drive-types";
import * as filePreviewUtils from "@/lib/file-preview/file-preview-utils";
import { useDriveGridPreviews } from "@/drive-core/src/use-drive-grid-previews";

const DOC: DriveFile = {
  id: "doc-1",
  category: "document",
  date: "Now",
  title: "Notes.md",
  excerpt: "",
  body: [],
  notebook: "",
  tags: [],
  wordCount: 0,
  parent: "My Drive",
  kind: "doc",
  size: "1 KB",
  apiPath: "/users/alice/Notes.md",
};

const IMAGE: DriveFile = {
  ...DOC,
  id: "img-1",
  title: "photo.png",
  kind: "image",
  apiPath: "/users/alice/photo.png",
};

function createOperations(
  handlers: Partial<Pick<DriveAPIOperations, "readFileBlob">>,
): DriveAPIOperations {
  return {
    refreshState: async () => ({}) as never,
    changeDir: async () => ({}) as never,
    listDirectory: async () => ({}) as never,
    search: async () => [],
    createFolder: async () => ({}) as never,
    createFile: async () => ({}) as never,
    renameItem: async () => ({}) as never,
    deleteItems: async () => ({}) as never,
    downloadFile: async () => {},
    readFileBlob: handlers.readFileBlob ?? (async () => new Blob()),
    checkUploadReady: async () => {},
    listStars: async () => [],
    listEntriesByPaths: async () => [],
    setStar: async () => {},
    uploadFiles: async () => ({}) as never,
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useDriveGridPreviews", () => {
  it("uses search excerpt without fetching when available", async () => {
    const readFileBlob = vi.fn();
    const file = { ...DOC, excerpt: "Indexed preview snippet for the tile." };

    const { result } = renderHook(() =>
      useDriveGridPreviews({
        items: [file],
        operations: createOperations({ readFileBlob }),
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.filePreviews[file.id]?.kind).toBe("text");
    });
    expect(readFileBlob).not.toHaveBeenCalled();
    expect(result.current.filePreviews[file.id]).toMatchObject({
      kind: "text",
      content: expect.stringContaining("Indexed preview"),
    });
  });

  it("fetches blob URLs for image tiles and revokes on unmount", async () => {
    const blob = new Blob(["png"], { type: "image/png" });
    const readFileBlob = vi.fn(async () => blob);
    const revokeSpy = vi.spyOn(URL, "revokeObjectURL");
    const readDimensions = vi
      .spyOn(filePreviewUtils, "readBlobMediaDimensions")
      .mockResolvedValue({ width: 120, height: 80 });

    const { result, unmount } = renderHook(() =>
      useDriveGridPreviews({
        items: [IMAGE],
        operations: createOperations({ readFileBlob }),
        enabled: true,
      }),
    );

    await waitFor(() => {
      expect(result.current.filePreviews[IMAGE.id]?.kind).toBe("blob-url");
    });
    expect(readFileBlob).toHaveBeenCalledWith(IMAGE.apiPath);
    expect(readDimensions).toHaveBeenCalledWith(blob, "image");
    expect(result.current.filePreviews[IMAGE.id]).toMatchObject({
      kind: "blob-url",
      width: 120,
      height: 80,
    });

    unmount();
    expect(revokeSpy).toHaveBeenCalled();
  });

  it("drops previews for items that scroll out of the visible set", async () => {
    const readFileBlob = vi.fn(async () => new Blob(["# Hello"], { type: "text/plain" }));

    const { result, rerender } = renderHook(
      ({ items }: { items: DriveFile[] }) =>
        useDriveGridPreviews({
          items,
          operations: createOperations({ readFileBlob }),
          enabled: true,
        }),
      { initialProps: { items: [DOC] } },
    );

    await waitFor(() => {
      expect(result.current.filePreviews[DOC.id]).toBeDefined();
    });

    await act(async () => {
      rerender({ items: [] });
    });

    expect(result.current.filePreviews[DOC.id]).toBeUndefined();
  });

  it("fetches full docs preview for the active detail/lightbox file", async () => {
    const markdown = "# Hello\n\nPreview body for the detail pane.";
    const readFileBlob = vi.fn(async () => new Blob([markdown], { type: "text/markdown" }));

    const { result } = renderHook(() =>
      useDriveGridPreviews({
        items: [DOC],
        operations: createOperations({ readFileBlob }),
        enabled: true,
        extraFile: DOC,
      }),
    );

    await waitFor(() => {
      expect(result.current.richPreviews[DOC.id]?.kind).toBe("docs");
    });
    expect(readFileBlob).toHaveBeenCalledWith(DOC.apiPath);
    expect(result.current.richPreviews[DOC.id]).toMatchObject({
      kind: "docs",
      content: markdown,
    });
    expect(result.current.filePreviews[DOC.id]?.kind).toBe("text");
  });
});
