import "fake-indexeddb/auto";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getConnectivitySnapshot,
  resetConnectivityHubForTests,
} from "@/lib/offline/browser-online";
import { DEFAULT_RTC_SETTINGS } from "@/lib/rtc/types";
import type { DocsCollabWireOperations } from "./docs-collab-wire";
import {
  useDocsCollab,
  DEFAULT_DOCS_COLLAB_URLS,
  resetDocsCollabBackoffForTests,
} from "./use-docs-collab";

const rtcMocks = vi.hoisted(() => ({
  mockJoin: vi.fn(),
  mockLeave: vi.fn(),
  mockBroadcast: vi.fn(),
  mockOnMessage: vi.fn(),
  mockGetPeerIds: vi.fn(() => [] as string[]),
  mockLinkCount: vi.fn(() => 0),
  mockGetRoomPeerStatuses: vi.fn(() => [] as { id: string; name: string; link: string }[]),
  mockGetMyId: vi.fn(() => "peer-a"),
  mockGetMyName: vi.fn(() => "Alex"),
}));

vi.mock("./docs-rtc-session", () => ({
  DocsRtcSession: class MockDocsRtcSession {
    join = rtcMocks.mockJoin;
    leave = rtcMocks.mockLeave;
    broadcast = rtcMocks.mockBroadcast;
    onMessage = rtcMocks.mockOnMessage;
    getPeerIds = rtcMocks.mockGetPeerIds;
    linkCount = rtcMocks.mockLinkCount;
    getRoomPeerStatuses = rtcMocks.mockGetRoomPeerStatuses;
    getMyId = rtcMocks.mockGetMyId;
    getMyName = rtcMocks.mockGetMyName;
    sendTo = vi.fn();
  },
}));

const { mockJoin } = rtcMocks;

const wire: DocsCollabWireOperations = {
  fetchAuthToken: vi.fn(async () => "test-token"),
  fetchRtcSettings: vi.fn(async () => DEFAULT_RTC_SETTINGS),
};

const testUrls = {
  ...DEFAULT_DOCS_COLLAB_URLS,
  room: "docs/offline-test.md",
  documentUrl: "/api/v1/files/collaboration?path=docs%2Foffline-test.md",
  yjsUrl: "/api/v1/files/collaboration?path=docs%2Foffline-test.md&format=yjs",
};

function mockFetchResponses(options: {
  markdown?: string;
  yjsStatus?: number;
  saveFails?: boolean;
  loadFails?: boolean;
}) {
  const { markdown = "# Hello", yjsStatus = 204, saveFails = false, loadFails = false } = options;
  return vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    if (loadFails) {
      throw new TypeError("Failed to fetch");
    }
    if (url.includes("format=yjs")) {
      return new Response(yjsStatus === 204 ? null : new Uint8Array([1, 2, 3]), {
        status: yjsStatus,
      });
    }
    if (init?.method === "PUT" || init?.method === "POST") {
      if (saveFails) {
        return new Response(JSON.stringify({ error: "network down" }), { status: 503 });
      }
      return new Response("{}", { status: 200 });
    }
    return new Response(markdown, { status: 200 });
  });
}

describe("useDocsCollab offline lifecycle", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetConnectivityHubForTests();
    resetDocsCollabBackoffForTests();
    mockJoin.mockResolvedValue({ peers: [] });
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
    vi.stubGlobal("fetch", mockFetchResponses({}));
  });

  afterEach(() => {
    resetConnectivityHubForTests();
    resetDocsCollabBackoffForTests();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("joins offline without mesh and exposes an editing session", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);

    const { result } = renderHook(() =>
      useDocsCollab({
        userName: "Alex",
        autoJoin: true,
        urls: testUrls,
        wire,
      }),
    );

    await waitFor(() => expect(result.current.session).not.toBeNull());
    expect(result.current.joined).toBe(true);
    expect(result.current.status).toBe("Editing offline");
    expect(mockJoin).not.toHaveBeenCalled();
  });

  it("joins online with mesh after IDB sync and server fetch", async () => {
    const { result } = renderHook(() =>
      useDocsCollab({
        userName: "Alex",
        autoJoin: true,
        urls: testUrls,
        wire,
      }),
    );

    await waitFor(() => expect(result.current.session).not.toBeNull());
    expect(mockJoin).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(result.current.status).toContain("Mesh"));
  });

  it("exposes session before server fetch completes", async () => {
    let resolveMarkdown: ((value: Response) => void) | undefined;
    const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      if (url.includes("format=yjs")) {
        return new Response(null, { status: 204 });
      }
      if (init?.method === "PUT" || init?.method === "POST") {
        return new Response("{}", { status: 200 });
      }
      return new Promise<Response>((resolve) => {
        resolveMarkdown = resolve;
      });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { result } = renderHook(() =>
      useDocsCollab({
        userName: "Alex",
        autoJoin: true,
        urls: testUrls,
        wire,
      }),
    );

    await waitFor(() => expect(result.current.session).not.toBeNull());
    expect(fetchMock).toHaveBeenCalled();
    expect(resolveMarkdown).toBeDefined();

    await act(async () => {
      resolveMarkdown?.(new Response("# Hello", { status: 200 }));
    });
  });

  it("exposes session before mesh join completes", async () => {
    let resolveJoin: ((value: { peers: [] }) => void) | undefined;
    mockJoin.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveJoin = resolve;
        }),
    );

    const { result } = renderHook(() =>
      useDocsCollab({
        userName: "Alex",
        autoJoin: true,
        urls: testUrls,
        wire,
      }),
    );

    await waitFor(() => expect(result.current.session).not.toBeNull());
    expect(result.current.joined).toBe(true);
    expect(mockJoin).toHaveBeenCalledTimes(1);
    expect(result.current.status).toBe("Connecting to mesh…");

    await act(async () => {
      resolveJoin?.({ peers: [] });
    });

    await waitFor(() => expect(result.current.status).toContain("Mesh"));
  });

  it("marks pendingSync when server save fails while online", async () => {
    vi.stubGlobal("fetch", mockFetchResponses({ saveFails: true }));

    const { result } = renderHook(() =>
      useDocsCollab({
        userName: "Alex",
        autoJoin: true,
        urls: testUrls,
        wire,
      }),
    );

    await waitFor(() => expect(result.current.session).not.toBeNull());

    act(() => {
      result.current.onMarkdownChange(() => "# edited");
    });

    await waitFor(
      () => {
        expect(result.current.pendingSync).toBe(true);
      },
      { timeout: 5000 },
    );
    expect(result.current.failedSync).toBe(true);
  });

  it("restores pendingSync from IDB meta on reopen", async () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    vi.stubGlobal("fetch", mockFetchResponses({ saveFails: true, loadFails: true }));

    const first = renderHook(() =>
      useDocsCollab({
        userName: "Alex",
        autoJoin: true,
        urls: testUrls,
        wire,
      }),
    );

    await waitFor(() => expect(first.result.current.session).not.toBeNull());

    act(() => {
      first.result.current.onMarkdownChange(() => "# offline edit");
    });

    await waitFor(() => expect(first.result.current.pendingSync).toBe(true), { timeout: 5000 });
    await act(async () => {
      await first.unmount();
    });

    const second = renderHook(() =>
      useDocsCollab({
        userName: "Alex",
        autoJoin: true,
        urls: testUrls,
        wire,
      }),
    );

    await waitFor(() => expect(second.result.current.pendingSync).toBe(true));
    expect(getConnectivitySnapshot()).toBe(false);
  });

  it("flushes pending save after reconnect", async () => {
    let online = false;
    vi.spyOn(navigator, "onLine", "get").mockImplementation(() => online);
    vi.stubGlobal("fetch", mockFetchResponses({ loadFails: true, saveFails: true }));

    const { result } = renderHook(() =>
      useDocsCollab({
        userName: "Alex",
        autoJoin: true,
        urls: testUrls,
        wire,
      }),
    );

    await waitFor(() => expect(result.current.session).not.toBeNull());

    act(() => {
      result.current.onMarkdownChange(() => "# reconnect edit");
    });
    await waitFor(() => expect(result.current.pendingSync).toBe(true), { timeout: 5000 });

    online = true;
    vi.stubGlobal("fetch", mockFetchResponses({ saveFails: false }));
    window.dispatchEvent(new Event("online"));
    window.dispatchEvent(new Event("focus"));

    await waitFor(() => expect(result.current.pendingSync).toBe(false), { timeout: 7000 });
  });

  it("does not rejoin when wire object identity changes", async () => {
    const makeWire = (): DocsCollabWireOperations => ({
      fetchAuthToken: vi.fn(async () => "test-token"),
      fetchRtcSettings: vi.fn(async () => DEFAULT_RTC_SETTINGS),
    });

    const { result, rerender } = renderHook(
      ({ nextWire }) =>
        useDocsCollab({
          userName: "Alex",
          autoJoin: true,
          urls: testUrls,
          wire: nextWire,
        }),
      { initialProps: { nextWire: makeWire() } },
    );

    await waitFor(() => expect(result.current.session).not.toBeNull());
    expect(mockJoin).toHaveBeenCalledTimes(1);

    rerender({ nextWire: makeWire() });
    await waitFor(() => expect(result.current.session).not.toBeNull());
    expect(mockJoin).toHaveBeenCalledTimes(1);
  });

  it("backs off collaboration GET retries across quick remounts", async () => {
    let collaborationGetCount = 0;
    const failingFetch = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (method === "GET" && url.includes("/api/v1/files/collaboration")) {
        collaborationGetCount += 1;
        throw new TypeError("Failed to fetch");
      }
      return new Response("{}", { status: 200 });
    });
    vi.stubGlobal("fetch", failingFetch);

    const first = renderHook(() =>
      useDocsCollab({
        userName: "Alex",
        autoJoin: true,
        urls: testUrls,
        wire,
      }),
    );
    await waitFor(() => expect(first.result.current.session).not.toBeNull());
    await act(async () => {
      first.unmount();
    });

    const firstAttemptCount = collaborationGetCount;
    expect(firstAttemptCount).toBeGreaterThan(0);

    const second = renderHook(() =>
      useDocsCollab({
        userName: "Alex",
        autoJoin: true,
        urls: testUrls,
        wire,
      }),
    );
    await waitFor(() => expect(second.result.current.session).not.toBeNull());
    expect(collaborationGetCount).toBe(firstAttemptCount);
  });
});
