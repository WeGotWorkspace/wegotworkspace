import { describe, expect, it } from "vitest";
import {
  buildActiveMeetRoster,
  listKnockersFromRoster,
  listNewParticipantNames,
} from "@/meet-core/src/meet-poll-roster";
import { encodeMeetKnockerName } from "@/meet-core/src/meet-control-messages";

describe("meet poll roster", () => {
  it("lists knockers from encoded roster names", () => {
    const knockers = listKnockersFromRoster([
      { id: "k1", name: encodeMeetKnockerName("Guest") },
      { id: "p2", name: "Host" },
    ]);
    expect(knockers).toEqual([{ id: "k1", name: "Guest" }]);
  });

  it("builds active roster without pending knockers", () => {
    const pending = new Set(["k1"]);
    const active = buildActiveMeetRoster(
      [
        { id: "k1", name: encodeMeetKnockerName("Guest") },
        { id: "p2", name: "Host" },
      ],
      pending,
    );
    expect([...active.entries()]).toEqual([["p2", "Host"]]);
  });

  it("lists newly joined participant names", () => {
    const previous = new Map([["p1", "Host"]]);
    const next = new Map([
      ["p1", "Host"],
      ["p2", "Guest"],
    ]);
    expect(listNewParticipantNames(previous, next, "self")).toEqual(["Guest"]);
    expect(listNewParticipantNames(previous, next, "p2")).toEqual([]);
  });
});
