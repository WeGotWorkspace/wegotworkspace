import { beforeEach, describe, expect, it, vi } from "vitest";
import { createMediaBinding } from "@/lib/rtc/session/bindings";

describe("createMediaBinding", () => {
  beforeEach(() => {
    class MockMediaStream {
      private tracks: MediaStreamTrack[] = [];

      addTrack(track: MediaStreamTrack) {
        if (!this.tracks.includes(track)) this.tracks.push(track);
      }

      getTracks() {
        return this.tracks;
      }
    }

    vi.stubGlobal("MediaStream", MockMediaStream);
  });

  it("notifies onRemoteStream when ontrack fires", () => {
    const onRemoteStream = vi.fn();
    const binding = createMediaBinding({
      getLocalStream: () => null,
      onRemoteStream,
    });

    const pc = {
      addTrack: vi.fn(),
      ontrack: null as RTCPeerConnection["ontrack"],
    } as unknown as RTCPeerConnection;

    const remoteStream = binding.attach(pc, "REMOTE1");
    expect(pc.ontrack).toBeTypeOf("function");

    const track = { kind: "audio" } as MediaStreamTrack;
    pc.ontrack?.({
      track,
      streams: [],
    } as RTCTrackEvent);

    expect(remoteStream.getTracks()).toContain(track);
    expect(onRemoteStream).toHaveBeenCalledWith("REMOTE1", remoteStream);
  });
});
