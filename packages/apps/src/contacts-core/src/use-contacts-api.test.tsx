import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createContactsAppBootstrap } from "@/lib/api/mock/contacts-bootstrap";
import { useContactsAPI } from "./use-contacts-api";
import type { ContactsApiSource } from "./contacts-api-source";

const mockPatchBootstrap = vi.fn();
const mockLoadBootstrap = vi.fn();

vi.mock("@/hooks/use-workspace-api", () => ({
  useWorkspaceApi: () => ({
    phase: "ready",
    error: null,
    retry: vi.fn(),
    successVersion: 1,
    listLoading: false,
    session: createContactsAppBootstrap().session,
    data: createContactsAppBootstrap().data,
    operations: undefined,
    patchBootstrap: mockPatchBootstrap,
  }),
}));

describe("useContactsAPI", () => {
  beforeEach(() => {
    mockPatchBootstrap.mockReset();
    mockLoadBootstrap.mockReset();
    mockLoadBootstrap.mockResolvedValue(createContactsAppBootstrap());
  });

  it("refreshList reloads bootstrap and patches workspace data", async () => {
    const source: ContactsApiSource = {
      loadBootstrap: mockLoadBootstrap,
      createOperations: () => undefined,
    };

    const { result } = renderHook(() => useContactsAPI(source));

    act(() => {
      result.current.refreshList();
    });

    expect(result.current.listLoading).toBe(true);

    await waitFor(() => {
      expect(result.current.listLoading).toBe(false);
    });

    expect(mockLoadBootstrap).toHaveBeenCalledTimes(1);
    expect(mockPatchBootstrap).toHaveBeenCalledTimes(1);
    expect(mockPatchBootstrap.mock.calls[0]?.[0]()).toEqual(createContactsAppBootstrap());
  });
});
