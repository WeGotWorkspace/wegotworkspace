/** @vitest-environment jsdom */
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  notifyNotesBootstrapUpdated,
  subscribeNotesBootstrapUpdated,
} from "@/lib/offline/notes-bootstrap-sync";

class MockBroadcastChannel {
  static peers: MockBroadcastChannel[] = [];
  onmessage: ((event: MessageEvent) => void) | null = null;

  constructor(_name: string) {
    MockBroadcastChannel.peers.push(this);
  }

  postMessage(data: unknown): void {
    for (const peer of MockBroadcastChannel.peers) {
      if (peer !== this) peer.onmessage?.({ data } as MessageEvent);
    }
  }

  close(): void {
    const index = MockBroadcastChannel.peers.indexOf(this);
    if (index >= 0) MockBroadcastChannel.peers.splice(index, 1);
  }
}

describe("notes-bootstrap-sync", () => {
  beforeEach(() => {
    MockBroadcastChannel.peers = [];
    Reflect.deleteProperty(globalThis, "BroadcastChannel");
    vi.stubGlobal("BroadcastChannel", MockBroadcastChannel);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("notifies subscribers in other channel instances", () => {
    const onUpdate = vi.fn();
    subscribeNotesBootstrapUpdated("alice", onUpdate);
    notifyNotesBootstrapUpdated("alice");

    expect(onUpdate).toHaveBeenCalledOnce();
  });

  it("ignores updates for other usernames", () => {
    const onUpdate = vi.fn();
    subscribeNotesBootstrapUpdated("alice", onUpdate);
    notifyNotesBootstrapUpdated("bob");

    expect(onUpdate).not.toHaveBeenCalled();
  });
});
