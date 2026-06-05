import { describe, expect, it, vi } from "vitest";
import { HttpSignalingClient, type HttpSignalingFetch } from "@/lib/rtc/signaling/http-client";

describe("HttpSignalingClient", () => {
  it("posts join and poll to channel api base", async () => {
    const fetchImpl = vi.fn(async (url: string, init: RequestInit) => {
      const body = JSON.parse(String(init.body)) as Record<string, unknown>;
      if (url.endsWith("/join")) {
        expect(body.room).toBe("room-a");
        expect(body.name).toBe("Alice");
        return new Response(JSON.stringify({ peerId: "p1", peers: [] }), { status: 200 });
      }
      if (url.endsWith("/poll")) {
        expect(body.peerId).toBe("p1");
        expect(body.since).toBe(3);
        return new Response(JSON.stringify({ peers: [{ id: "p2", name: "Bob" }], messages: [] }), {
          status: 200,
        });
      }
      throw new Error(`unexpected url ${url}`);
    });

    const client = new HttpSignalingClient({
      channel: "collab",
      apiBase: "/api/v1/collab",
      fetchImpl,
      getAuth: () => ({ bearerToken: "token-1" }),
    });

    const joined = await client.join({ room: "room-a", name: "Alice" });
    expect(joined.peerId).toBe("p1");

    const poll = await client.poll({ room: "room-a", peerId: "p1", since: 3 });
    expect(poll.peers).toHaveLength(1);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("includes session key on voice guest sends", async () => {
    const fetchImpl = vi.fn<HttpSignalingFetch>(
      async () => new Response(JSON.stringify({ ok: true }), { status: 200 }),
    );
    const client = new HttpSignalingClient({
      channel: "voice",
      apiBase: "/api/v1/voice",
      fetchImpl,
      getAuth: () => ({ sessionKey: "guest-key" }),
    });
    await client.send({
      room: "abcd-efgh-ijkl",
      from: "self",
      to: "peer",
      type: "ice",
      payload: { candidate: "candidate:1 1 udp" },
    });
    const call = fetchImpl.mock.calls[0];
    expect(call).toBeDefined();
    const body = JSON.parse(String(call![1]?.body)) as Record<string, unknown>;
    expect(body.sessionKey).toBe("guest-key");
  });
});
