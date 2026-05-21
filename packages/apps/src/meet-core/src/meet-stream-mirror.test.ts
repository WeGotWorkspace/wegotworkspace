import { describe, expect, it } from "vitest";
import {
  isDisplayCaptureVideoTrack,
  shouldMirrorMeetStream,
} from "@/meet-core/src/meet-stream-mirror";

function fakeVideoTrack(overrides: { label?: string; displaySurface?: string }): MediaStreamTrack {
  const settings: MediaTrackSettings = {};
  if (overrides.displaySurface) {
    (settings as MediaTrackSettings & { displaySurface?: string }).displaySurface =
      overrides.displaySurface;
  }
  return {
    kind: "video",
    label: overrides.label ?? "",
    getSettings: () => settings,
  } as MediaStreamTrack;
}

describe("meet-stream-mirror", () => {
  it("detects display capture from displaySurface", () => {
    const track = fakeVideoTrack({ displaySurface: "monitor" });
    expect(isDisplayCaptureVideoTrack(track)).toBe(true);
  });

  it("detects display capture from label heuristics", () => {
    const track = fakeVideoTrack({ label: "screen:0:0" });
    expect(isDisplayCaptureVideoTrack(track)).toBe(true);
  });

  it("mirrors camera streams but not screen share", () => {
    const asStream = (track: MediaStreamTrack) =>
      ({ getVideoTracks: () => [track] }) as MediaStream;

    const camera = asStream(fakeVideoTrack({ label: "FaceTime HD Camera" }));
    const screen = asStream(fakeVideoTrack({ displaySurface: "monitor" }));

    expect(shouldMirrorMeetStream(camera)).toBe(true);
    expect(shouldMirrorMeetStream(screen)).toBe(false);
    expect(shouldMirrorMeetStream(camera, true)).toBe(false);
  });
});
