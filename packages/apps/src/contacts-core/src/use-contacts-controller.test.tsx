import { act, renderHook } from "@testing-library/react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { createContactsAppBootstrap } from "@/lib/api/mock/contacts-bootstrap";
import { useContactsController } from "./use-contacts-controller";

vi.mock("@/hooks/use-app-toast", () => ({
  useAppToast: () => ({
    show: vi.fn(),
    showError: vi.fn(),
    showSuccess: vi.fn(),
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

const bootstrap = createContactsAppBootstrap();

function clickSelect(result: { current: ReturnType<typeof useContactsController> }, id: string) {
  act(() => {
    result.current.handleSelect(id, {
      detail: 1,
      metaKey: false,
      ctrlKey: false,
      shiftKey: false,
    } as ReactMouseEvent);
  });
}

describe("useContactsController", () => {
  it("selects a contact and filters the list by search query", () => {
    const { result } = renderHook(() =>
      useContactsController({
        data: bootstrap.data,
        listLoading: false,
      }),
    );

    clickSelect(result, "card-jane");
    expect(result.current.activeId).toBe("card-jane");
    expect(result.current.active?.id).toBe("card-jane");

    act(() => {
      result.current.selectView("all");
    });

    act(() => {
      result.current.setSearchQuery("joe@");
    });
    expect(result.current.visibleCards.map((card) => card.id)).toEqual(["card-joe"]);
  });

  it("cancel edit restores read mode without draft state", () => {
    const { result } = renderHook(() =>
      useContactsController({
        data: bootstrap.data,
        listLoading: false,
      }),
    );

    clickSelect(result, "card-jane");
    act(() => {
      result.current.startEdit();
    });
    expect(result.current.editMode).toBe(true);
    expect(result.current.editDraft).not.toBeNull();

    act(() => {
      result.current.updateEditDraft({ nameGiven: "Changed Name" });
    });

    act(() => {
      result.current.cancelEdit();
    });

    expect(result.current.editMode).toBe(false);
    expect(result.current.editDraft).toBeNull();
    expect(result.current.active?.name?.full).toBe("Jane Doe");
  });
});
