import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createNotesAppBootstrap } from "@/lib/api/mock/notes-bootstrap";
import { useNotesAPI } from "./use-notes-api";
import type { NotesApiSource } from "./notes-api-source";

const mockPatchBootstrap = vi.fn();
const mockLoadBootstrap = vi.fn();
const mockFlush = vi.fn();

vi.mock("@/lib/live/use-hybrid-bootstrap", () => ({
  useHybridBootstrap: () => ({
    phase: "ready",
    error: null,
    data: createNotesAppBootstrap(),
    load: vi.fn(),
    successVersion: 1,
    patchBootstrap: mockPatchBootstrap,
  }),
}));

vi.mock("@/lib/offline/notes-hybrid-operations", () => ({
  createHybridNotesOperations: vi.fn(),
  getNotesSyncRunner: () => ({ flush: mockFlush }),
}));

vi.mock("@/hooks/use-connectivity", () => ({
  useConnectivity: () => ({ online: true }),
  useOnReconnect: (callback: () => void) => {
    callback();
  },
}));

describe("useNotesAPI", () => {
  beforeEach(() => {
    mockPatchBootstrap.mockReset();
    mockLoadBootstrap.mockReset();
    mockFlush.mockReset();
    mockFlush.mockResolvedValue({ stateMismatches: [], bootstrap: null });
    mockLoadBootstrap.mockResolvedValue(createNotesAppBootstrap());
  });

  it("refreshList reloads bootstrap and patches workspace data", async () => {
    const source: NotesApiSource = {
      loadBootstrap: mockLoadBootstrap,
      createOperations: () => undefined,
    };

    const { result } = renderHook(() => useNotesAPI(source));

    act(() => {
      result.current.refreshList();
    });

    expect(result.current.listLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.listLoading).toBe(false);
    });

    expect(mockLoadBootstrap).toHaveBeenCalledTimes(1);
    expect(mockPatchBootstrap).toHaveBeenCalledTimes(1);
    expect(mockPatchBootstrap.mock.calls[0]?.[0]()).toEqual(createNotesAppBootstrap());
  });

  it("forwards sync conflicts reported during bootstrap flush", async () => {
    const onSyncConflict = vi.fn();
    const source: NotesApiSource = {
      loadBootstrap: mockLoadBootstrap,
      createOperations: () => undefined,
    };

    renderHook(() => useNotesAPI(source, { onSyncConflict }));

    const { reportNotesSyncConflicts } = await import("@/lib/offline/notes-sync-conflicts");
    reportNotesSyncConflicts(["note-1"]);

    expect(onSyncConflict).toHaveBeenCalledWith(["note-1"]);
  });
});
