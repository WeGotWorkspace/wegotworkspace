import { act, renderHook } from "@testing-library/react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Note } from "@/lib/models/note";
import type { NotesUIData } from "./notes-types";
import { useNotesController } from "./use-notes-controller";

vi.mock("@/hooks/use-app-toast", () => ({
  useAppToast: () => ({
    show: vi.fn(),
    showError: vi.fn(),
    showSuccess: vi.fn(),
    dismiss: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-confirm-dialog", () => ({
  useConfirmDialog: () => ({
    confirmDialog: null,
    requestConfirm: vi.fn(),
  }),
}));

vi.mock("@/hooks/use-is-touch", () => ({
  useIsTouch: () => false,
}));

const localNote: Note = {
  id: "local-offline-create",
  category: "Note",
  date: "2024-10-12T10:00:00.000Z",
  excerpt: "Draft excerpt",
  body: ["Draft body"],
  notebook: "Drafts",
  tags: [],
  wordCount: 2,
};

const syncedNote: Note = {
  ...localNote,
  id: "server-note-99",
  excerpt: "Synced excerpt",
  body: ["Synced body"],
};

function clickSelect(result: { current: ReturnType<typeof useNotesController> }, id: string) {
  act(() => {
    result.current.handleSelect(id, {
      detail: 1,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
    } as ReactMouseEvent);
  });
}

describe("useNotesController bootstrap sync", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("follows activeId when a local temp note is remapped during sync", () => {
    const initialData: NotesUIData = {
      notes: [localNote],
      notebooks: ["Drafts"],
      tags: [],
    };
    const syncedData: NotesUIData = {
      notes: [syncedNote],
      notebooks: ["Drafts"],
      tags: [],
    };

    const { result, rerender } = renderHook(
      ({ data }: { data: NotesUIData }) => useNotesController({ data, listLoading: false }),
      { initialProps: { data: initialData } },
    );

    clickSelect(result, localNote.id);
    expect(result.current.activeId).toBe(localNote.id);

    rerender({ data: syncedData });

    expect(result.current.activeId).toBe(syncedNote.id);
    expect(result.current.active?.id).toBe(syncedNote.id);
    expect(result.current.active?.body).toEqual(["Synced body"]);
  });

  it("refreshes the active note when bootstrap syncs updated server content", () => {
    const initialData: NotesUIData = {
      notes: [{ ...localNote, id: "note-1", excerpt: "Before sync", body: ["Before body"] }],
      notebooks: ["Drafts"],
      tags: [],
    };
    const syncedData: NotesUIData = {
      notes: [{ ...localNote, id: "note-1", excerpt: "After sync", body: ["Server body"] }],
      notebooks: ["Drafts"],
      tags: [],
    };

    const { result, rerender } = renderHook(
      ({ data }: { data: NotesUIData }) => useNotesController({ data, listLoading: false }),
      { initialProps: { data: initialData } },
    );

    clickSelect(result, "note-1");
    expect(result.current.active?.excerpt).toBe("Before sync");

    rerender({ data: syncedData });

    expect(result.current.activeId).toBe("note-1");
    expect(result.current.active?.excerpt).toBe("After sync");
    expect(result.current.active?.body).toEqual(["Server body"]);
  });
});
