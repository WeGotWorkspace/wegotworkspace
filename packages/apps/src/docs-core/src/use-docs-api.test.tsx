import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createDocsAppBootstrap } from "@/lib/api/mock/docs-bootstrap";
import { mockWorkspaceSession } from "@/lib/api/mock/workspace-session-mock";
import { useDocsAPI } from "./use-docs-api";
import type { DocsApiSource } from "./docs-api-source";

const bootstrap = createDocsAppBootstrap({
  session: {
    ...mockWorkspaceSession,
    user: { ...mockWorkspaceSession.user, username: "demo@example.com" },
  },
});

const mockLoadBootstrap = vi.fn();
const mockHybridLoad = vi.fn();

vi.mock("@/lib/live/use-hybrid-bootstrap", () => ({
  useHybridBootstrap: () => ({
    phase: "ready",
    error: null,
    data: bootstrap,
    load: mockHybridLoad,
    successVersion: 1,
  }),
}));

const mockNetworkOperations = {
  loadFile: vi.fn(),
  saveFile: vi.fn(),
  renameFile: vi.fn(),
};

describe("useDocsAPI", () => {
  beforeEach(() => {
    mockLoadBootstrap.mockReset();
    mockHybridLoad.mockReset();
    mockLoadBootstrap.mockResolvedValue(bootstrap);
  });

  it("returns bootstrap data and network operations", async () => {
    const source: DocsApiSource = {
      loadBootstrap: mockLoadBootstrap,
      createNetworkOperations: () => mockNetworkOperations,
      createOperations: () => undefined,
    };

    const { result } = renderHook(() => useDocsAPI(source));

    await waitFor(() => expect(result.current.session.user.username).toBe("demo@example.com"));
    expect(result.current.data).toEqual(bootstrap.data);
    expect(result.current.networkOperations).toBe(mockNetworkOperations);
    expect(result.current.successVersion).toBe(1);
  });

  it("exposes retry from hybrid bootstrap", async () => {
    const source: DocsApiSource = {
      loadBootstrap: mockLoadBootstrap,
      createNetworkOperations: () => mockNetworkOperations,
      createOperations: () => undefined,
    };

    const { result } = renderHook(() => useDocsAPI(source));

    await act(async () => {
      result.current.retry();
    });
    expect(mockHybridLoad).toHaveBeenCalledTimes(1);
  });
});
