import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createMediaBinding } from "@/lib/rtc/session/bindings";
import { RtcPeerMesh } from "@/lib/rtc/session/peer-mesh";
import type { HttpSignalingPollResult } from "@/lib/rtc/signaling/http-client";
import type { RtcSettings } from "@/lib/rtc/types";

vi.mock("@/lib/rtc/log", () => ({ rtcLog: vi.fn() }));
vi.mock("@/lib/rtc/telemetry/selected-pair", () => ({
  logSelectedPairTelemetry: vi.fn(),
}));

const RTC_SETTINGS: RtcSettings = {
  stunUrls: "",
  turnUrls: "",
  turnUsername: "",
  turnPassword: "",
  forceRelay: false,
};

type StubPc = RTCPeerConnection & {
  __localDesc: RTCSessionDescriptionInit | null;
  __remoteDesc: RTCSessionDescriptionInit | null;
};

function createStubPeerConnection(offerSdp?: string): StubPc {
  const pc = {
    connectionState: "new" as RTCPeerConnectionState,
    iceConnectionState: "new" as RTCIceConnectionState,
    signalingState: "stable" as RTCSignalingState,
    localDescription: null as RTCSessionDescription | null,
    remoteDescription: null as RTCSessionDescription | null,
    onicecandidate: null as RTCPeerConnection["onicecandidate"],
    ontrack: null as RTCPeerConnection["ontrack"],
    onconnectionstatechange: null as RTCPeerConnection["onconnectionstatechange"],
    oniceconnectionstatechange: null as RTCPeerConnection["oniceconnectionstatechange"],
    __localDesc: null as RTCSessionDescriptionInit | null,
    __remoteDesc: null as RTCSessionDescriptionInit | null,
    getSenders: () => [],
    close: vi.fn(),
    addTrack: vi.fn(),
    createOffer: vi.fn(async () => ({
      type: "offer" as const,
      sdp:
        offerSdp ??
        "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=ssrc:1234 cname:test\r\n",
    })),
    createAnswer: vi.fn(async () => ({
      type: "answer" as const,
      sdp: "v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n",
    })),
    setLocalDescription: vi.fn(async function (this: StubPc, desc: RTCSessionDescriptionInit) {
      this.__localDesc = desc;
      this.localDescription = desc as RTCSessionDescription;
      if (desc.type === "offer") this.signalingState = "have-local-offer";
      if (desc.type === "answer") this.signalingState = "stable";
    }),
    setRemoteDescription: vi.fn(async function (this: StubPc, desc: RTCSessionDescriptionInit) {
      this.__remoteDesc = desc;
      this.remoteDescription = desc as RTCSessionDescription;
      if (desc.type === "offer") this.signalingState = "have-remote-offer";
      if (desc.type === "answer") this.signalingState = "stable";
    }),
    addIceCandidate: vi.fn(async () => {}),
  } as StubPc;

  return pc;
}

function createMockSignaling(initialJoin: {
  peerId: string;
  peers?: Array<{ id: string; name: string }>;
  sessionKey?: string | null;
}) {
  const sends: Array<{ to: string; type: string; payload: unknown }> = [];
  let pollHandler: (() => Promise<HttpSignalingPollResult>) | null = null;

  const client = {
    join: vi.fn(async (input: { peerId?: string; name: string }) => ({
      peerId: input.peerId ?? initialJoin.peerId,
      peers: initialJoin.peers ?? [],
      sessionKey: initialJoin.sessionKey ?? null,
    })),
    poll: vi.fn(async () => {
      if (pollHandler) return pollHandler();
      return { peers: initialJoin.peers ?? [], messages: [] };
    }),
    send: vi.fn(async (input: { to: string; type: string; payload: unknown }) => {
      sends.push({ to: input.to, type: input.type, payload: input.payload });
      return { ok: true };
    }),
    leave: vi.fn(async () => ({ ok: true })),
  };

  return {
    client,
    sends,
    setPollHandler(handler: () => Promise<HttpSignalingPollResult>) {
      pollHandler = handler;
    },
  };
}

function meshWithStubPc(
  signaling: ReturnType<typeof createMockSignaling>["client"],
  overrides: Partial<ConstructorParameters<typeof RtcPeerMesh>[0]> = {},
) {
  const pcs = new Map<string, StubPc>();
  return {
    pcs,
    mesh: new RtcPeerMesh({
      channel: "meet",
      room: "test-room",
      signaling,
      rtcSettings: RTC_SETTINGS,
      initiatorRule: "higherId",
      pollIntervals: { connectingMs: 400, steadyMs: 1200 },
      ...overrides,
      ports: {
        createPeerConnection: () => {
          const pc = createStubPeerConnection();
          pcs.set(String(pcs.size), pc);
          return pc;
        },
        ...overrides.ports,
      },
    }),
  };
}

async function flushAsyncWork() {
  for (let i = 0; i < 8; i += 1) {
    await Promise.resolve();
  }
}

describe("RtcPeerMesh", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("schedules poll with bound timers after join", async () => {
    const signaling = createMockSignaling({ peerId: "PEER_HIGH_ID" });
    const setTimeoutSpy = vi.spyOn(globalThis, "setTimeout");

    const { mesh } = meshWithStubPc(signaling.client);
    await mesh.join({ name: "Host", peerId: "PEER_HIGH_ID" });

    expect(setTimeoutSpy).toHaveBeenCalledWith(expect.any(Function), 400);
    await mesh.leave();
    setTimeoutSpy.mockRestore();
  });

  it("sends offer when meet higherId initiator sees a new peer", async () => {
    const signaling = createMockSignaling({
      peerId: "ZZZZZZZZZZ",
      peers: [{ id: "AAAAAAAAAA", name: "Guest" }],
    });
    const { mesh } = meshWithStubPc(signaling.client);

    await mesh.join({ name: "Host", peerId: "ZZZZZZZZZZ" });
    await flushAsyncWork();

    expect(signaling.sends.some((s) => s.type === "offer" && s.to === "AAAAAAAAAA")).toBe(true);
    await mesh.leave();
  });

  it("does not send offer when meet higherId peer is lower id", async () => {
    const signaling = createMockSignaling({
      peerId: "AAAAAAAAAA",
      peers: [{ id: "ZZZZZZZZZZ", name: "Host" }],
    });
    const { mesh } = meshWithStubPc(signaling.client);

    await mesh.join({ name: "Guest", peerId: "AAAAAAAAAA" });

    expect(signaling.sends.some((s) => s.type === "offer")).toBe(false);
    await mesh.leave();
  });

  it("answers an inbound offer", async () => {
    const signaling = createMockSignaling({ peerId: "AAAAAAAAAA", peers: [] });
    const { mesh } = meshWithStubPc(signaling.client);

    await mesh.join({ name: "Guest", peerId: "AAAAAAAAAA" });

    signaling.setPollHandler(async () => ({
      peers: [{ id: "ZZZZZZZZZZ", name: "Host" }],
      messages: [
        {
          from: "ZZZZZZZZZZ",
          type: "offer",
          payload: {
            type: "offer",
            sdp: "v=0\r\no=-\r\ns=-\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n",
          },
        },
      ],
    }));

    await vi.advanceTimersByTimeAsync(400);

    expect(signaling.sends.some((s) => s.type === "answer" && s.to === "ZZZZZZZZZZ")).toBe(true);
    await mesh.leave();
  });

  it("passes outbound SDP through formatOutbound without rewriting local descriptions", async () => {
    const offerWithSsrc =
      "v=0\r\no=-\r\ns=-\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=ssrc:9999 cname:keep-me\r\n";
    const outboundSpy = vi.fn((desc: RTCSessionDescriptionInit) => desc);
    const signaling = createMockSignaling({
      peerId: "ZZZZZZZZZZ",
      peers: [{ id: "AAAAAAAAAA", name: "Guest" }],
    });

    const pcs: StubPc[] = [];
    const mesh = new RtcPeerMesh({
      channel: "meet",
      room: "test-room",
      signaling: signaling.client,
      rtcSettings: RTC_SETTINGS,
      initiatorRule: "higherId",
      formatOutboundDescription: outboundSpy,
      ports: {
        createPeerConnection: () => {
          const pc = createStubPeerConnection(offerWithSsrc);
          pcs.push(pc);
          return pc;
        },
      },
    });

    await mesh.join({ name: "Host", peerId: "ZZZZZZZZZZ" });
    await flushAsyncWork();

    expect(outboundSpy).toHaveBeenCalled();
    const sentOffer = signaling.sends.find((s) => s.type === "offer");
    const payload = sentOffer?.payload as { sdp?: string };
    expect(payload?.sdp).toContain("a=ssrc:9999");
    expect(pcs[0]?.__localDesc?.sdp).toContain("a=ssrc:9999");
    await mesh.leave();
  });

  it("runs onPollData before handling rtc signals", async () => {
    let pollDataBeforeAnswer = false;
    const signaling = createMockSignaling({ peerId: "AAAAAAAAAA", peers: [] });
    const { mesh } = meshWithStubPc(signaling.client, {
      onPollData: async () => {
        if (!signaling.sends.some((s) => s.type === "answer")) {
          pollDataBeforeAnswer = true;
        }
      },
    });

    await mesh.join({ name: "Guest", peerId: "AAAAAAAAAA" });

    signaling.setPollHandler(async () => ({
      peers: [{ id: "ZZZZZZZZZZ", name: "Host" }],
      messages: [
        {
          from: "ZZZZZZZZZZ",
          type: "offer",
          payload: {
            type: "offer",
            sdp: "v=0\r\no=-\r\ns=-\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\n",
          },
        },
      ],
    }));

    await vi.advanceTimersByTimeAsync(400);
    await flushAsyncWork();

    expect(pollDataBeforeAnswer).toBe(true);
    expect(signaling.sends.some((s) => s.type === "answer")).toBe(true);
    await mesh.leave();
  });

  it("skips rtc connect when shouldConnectToPeer returns false", async () => {
    const signaling = createMockSignaling({
      peerId: "ZZZZZZZZZZ",
      peers: [{ id: "AAAAAAAAAA", name: "__wgw_knock__:Guest" }],
    });
    const { mesh } = meshWithStubPc(signaling.client, {
      shouldConnectToPeer: (peer) => !peer.name.startsWith("__wgw_knock__:"),
    });

    await mesh.join({ name: "Host", peerId: "ZZZZZZZZZZ" });

    expect(mesh.getPeerIds()).toHaveLength(0);
    expect(signaling.sends.some((s) => s.type === "offer")).toBe(false);
    await mesh.leave();
  });

  it("ignores chat messages during rtc signal handling", async () => {
    const signaling = createMockSignaling({ peerId: "AAAAAAAAAA", peers: [] });
    const { mesh } = meshWithStubPc(signaling.client);

    await mesh.join({ name: "Guest", peerId: "AAAAAAAAAA" });

    signaling.setPollHandler(async () => ({
      peers: [{ id: "ZZZZZZZZZZ", name: "Host" }],
      messages: [
        {
          from: "ZZZZZZZZZZ",
          type: "chat",
          payload: { text: "hello" },
        },
      ],
    }));

    await vi.advanceTimersByTimeAsync(400);

    expect(signaling.sends.some((s) => s.type === "answer")).toBe(false);
    await mesh.leave();
  });
});
