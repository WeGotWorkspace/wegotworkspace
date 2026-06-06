import { describe, expect, it } from "vitest";
import { parseUrlList, toRtcConfig } from "@/lib/rtc/config";
import type { RtcSettings } from "@/lib/rtc/types";

const baseSettings: RtcSettings = {
  stunUrls: "stun:stun.example.com:3478",
  turnUrls: "turn:turn.example.com:3478?transport=udp",
  turnUsername: "user",
  turnPassword: "pass",
  forceRelay: false,
};

describe("parseUrlList", () => {
  it("normalizes bare hostnames and splits csv/newlines", () => {
    expect(parseUrlList("host1, host2\nhost3", "stun")).toEqual([
      "stun:host1",
      "stun:host2",
      "stun:host3",
    ]);
  });

  it("preserves explicit schemes including ipv6", () => {
    expect(parseUrlList("stun:[2001:db8::1]:3478", "stun")).toEqual(["stun:[2001:db8::1]:3478"]);
  });
});

describe("toRtcConfig", () => {
  it("uses all transport with stun and turn when not forcing relay", () => {
    const config = toRtcConfig(baseSettings, "direct");
    expect(config.iceTransportPolicy).toBe("all");
    expect(config.iceCandidatePoolSize).toBe(4);
    expect(config.iceServers).toHaveLength(2);
  });

  it("forces relay-only ice servers when mode is relay", () => {
    const config = toRtcConfig(baseSettings, "relay");
    expect(config.iceTransportPolicy).toBe("relay");
    expect(config.iceCandidatePoolSize).toBe(0);
    expect(config.iceServers).toHaveLength(1);
    expect(config.iceServers?.[0]?.urls).toContain("turn:turn.example.com:3478?transport=udp");
  });

  it("ignores forceRelay when turn urls are missing", () => {
    const config = toRtcConfig({ ...baseSettings, turnUrls: "", forceRelay: true }, "direct");
    expect(config.iceTransportPolicy).toBe("all");
    expect(config.iceServers).toHaveLength(1);
  });

  it("allows collab pool size override", () => {
    const config = toRtcConfig(baseSettings, "direct", { iceCandidatePoolSize: 2 });
    expect(config.iceCandidatePoolSize).toBe(2);
  });
});
