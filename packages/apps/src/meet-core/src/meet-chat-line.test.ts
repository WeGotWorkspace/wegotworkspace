import { describe, expect, it, vi } from "vitest";
import { buildLocalMeetChatLine, buildMeetChatLineFromPoll } from "@/meet-core/src/meet-chat-line";

describe("meet chat line", () => {
  it("builds poll chat lines with self detection", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    vi.spyOn(Math, "random").mockReturnValue(0.123456);

    expect(
      buildMeetChatLineFromPoll("peer-a", "Host", " hello ", "peer-b", 1_700_000_000_000),
    ).toMatchObject({
      fromPeerId: "peer-a",
      fromName: "Host",
      body: "hello",
      ts: 1_700_000_000_000,
      isSelf: false,
    });
    expect(buildMeetChatLineFromPoll("peer-a", "Host", " hello ", "peer-b").id).toMatch(
      /^peer-a-\d+-[a-f0-9]+$/,
    );

    expect(
      buildMeetChatLineFromPoll("peer-a", "You", "hi", "peer-a", 1_700_000_000_000).isSelf,
    ).toBe(true);
  });

  it("builds optimistic local chat lines", () => {
    vi.spyOn(Date, "now").mockReturnValue(1_700_000_000_000);
    vi.spyOn(Math, "random").mockReturnValue(0.654321);

    expect(buildLocalMeetChatLine("peer-a", "You", " hello ", 1_700_000_000_000)).toMatchObject({
      fromPeerId: "peer-a",
      fromName: "You",
      body: "hello",
      ts: 1_700_000_000_000,
      isSelf: true,
    });
    expect(buildLocalMeetChatLine("peer-a", "You", "hello").id).toMatch(/^me-\d+-[a-f0-9]+$/);
  });
});
