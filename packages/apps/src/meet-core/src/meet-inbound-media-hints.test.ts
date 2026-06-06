import { describe, expect, it } from "vitest";
import {
  advancePeerInboundSample,
  createPeerInboundSample,
} from "@/meet-core/src/meet-inbound-media-hints";
import type { InboundMediaTotals } from "@/meet-core/src/meet-inbound-media-stats";

const totals = (overrides: Partial<InboundMediaTotals> = {}): InboundMediaTotals => ({
  videoBytes: 0,
  audioBytes: 0,
  videoFramesDecoded: 0,
  audioEnergy: null,
  ...overrides,
});

describe("meet inbound media hints", () => {
  it("creates a baseline sample without media hints", () => {
    const result = advancePeerInboundSample(undefined, totals(), 1_000);
    expect(result.kind).toBe("baseline");
    if (result.kind !== "baseline") return;
    expect(result.sample.pollCount).toBe(1);
    expect(result.mediaHint).toBeNull();
  });

  it("ignores samples that arrive too soon", () => {
    const baseline = createPeerInboundSample(totals(), 1_000);
    const result = advancePeerInboundSample(
      baseline,
      totals({ videoBytes: 500, audioBytes: 100, videoFramesDecoded: 3 }),
      1_200,
    );
    expect(result.kind).toBe("too-soon");
  });

  it("marks camera and mic stalled after repeated quiet polls", () => {
    let sample = createPeerInboundSample(
      totals({ videoBytes: 1_000, audioBytes: 500, videoFramesDecoded: 10, audioEnergy: 1 }),
      1_000,
    );

    let mediaHint: { camera: boolean; mic: boolean } | null = null;
    for (let i = 0; i < 8; i += 1) {
      const next = advancePeerInboundSample(
        sample,
        totals({ videoBytes: 1_000, audioBytes: 500, videoFramesDecoded: 10, audioEnergy: 1 }),
        1_000 + (i + 1) * 500,
      );
      expect(next.kind).not.toBe("too-soon");
      if (next.kind === "too-soon" || next.kind === "baseline") continue;
      sample = next.sample;
      mediaHint = next.mediaHint;
    }

    expect(mediaHint).toEqual({ camera: false, mic: false });
  });

  it("keeps camera and mic live when inbound rtp grows", () => {
    let sample = createPeerInboundSample(
      totals({ videoBytes: 1_000, audioBytes: 500, videoFramesDecoded: 10, audioEnergy: 1 }),
      1_000,
    );

    let mediaHint: { camera: boolean; mic: boolean } | null = null;
    for (let i = 0; i < 4; i += 1) {
      const next = advancePeerInboundSample(
        sample,
        totals({
          videoBytes: 1_000 + (i + 1) * 400,
          audioBytes: 500 + (i + 1) * 120,
          videoFramesDecoded: 10 + i + 1,
          audioEnergy: 1 + (i + 1) * 0.5,
        }),
        1_000 + (i + 1) * 500,
      );
      expect(next.kind).not.toBe("too-soon");
      if (next.kind === "too-soon" || next.kind === "baseline") return;
      sample = next.sample;
      mediaHint = next.mediaHint;
    }

    expect(mediaHint).toEqual({ camera: true, mic: true });
  });
});
