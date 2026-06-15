import { act, renderHook } from "@testing-library/react";
import type { MouseEvent as ReactMouseEvent } from "react";
import { describe, expect, it, vi } from "vitest";
import { createContactsAppBootstrap } from "@/lib/api/mock/contacts-bootstrap";
import { contactsGroupViewKey } from "./contacts-group-utils";
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

  it("hides group cards from the default address book list", () => {
    const { result } = renderHook(() =>
      useContactsController({
        data: bootstrap.data,
        listLoading: false,
      }),
    );

    expect(result.current.visibleCards.map((card) => card.id)).not.toContain("card-group-friends");
    expect(result.current.visibleCards.map((card) => card.id)).not.toContain("card-group-family");
    expect(result.current.contactGroups.map((card) => card.id)).toEqual([
      "card-group-family",
      "card-group-friends",
    ]);
  });

  it("shows group members when a group sidebar view is selected", () => {
    const { result } = renderHook(() =>
      useContactsController({
        data: bootstrap.data,
        listLoading: false,
      }),
    );

    act(() => {
      result.current.selectView(contactsGroupViewKey("card-group-friends"));
    });

    expect(result.current.viewLabel).toBe("Friends");
    expect(result.current.visibleCards.map((card) => card.id)).toEqual(["card-jane", "card-joe"]);
    expect(result.current.canCreateContact).toBe(false);
    expect(result.current.selectedGroup?.id).toBe("card-group-friends");
    expect(result.current.canRenameGroup).toBe(true);
  });

  it("shows empty member list for group with unresolved members", () => {
    const emptyGroup = {
      "@type": "Card",
      version: "1.0",
      id: "card-group-empty",
      uid: "urn:uuid:550e8400-e29b-41d4-a716-446655440102",
      kind: "group",
      addressBookIds: { default: true },
      name: { full: "Empty Group" },
      members: { "urn:uuid:missing-member": true },
    } as unknown as import("@/contacts-core/src/contacts-types").ContactCard;

    const data = {
      ...bootstrap.data,
      cards: [...bootstrap.data.cards, emptyGroup],
    };

    const { result } = renderHook(() =>
      useContactsController({
        data,
        listLoading: false,
      }),
    );

    act(() => {
      result.current.selectView(contactsGroupViewKey("card-group-empty"));
    });

    expect(result.current.viewLabel).toBe("Empty Group");
    expect(result.current.visibleCards).toEqual([]);
  });

  it("optimistically renames a group in sidebar and list header", () => {
    const { result } = renderHook(() =>
      useContactsController({
        data: bootstrap.data,
        listLoading: false,
      }),
    );

    act(() => {
      result.current.selectView(contactsGroupViewKey("card-group-friends"));
    });

    act(() => {
      result.current.renameGroup("card-group-friends", "Close Friends");
    });

    expect(
      result.current.contactGroups.find((group) => group.id === "card-group-friends")?.name?.full,
    ).toBe("Close Friends");
    expect(result.current.viewLabel).toBe("Close Friends");
  });
});
