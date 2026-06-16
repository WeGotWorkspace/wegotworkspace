import { describe, expect, it } from "vitest";
import { throwOnSetMismatch, type ContactCardSetResponse } from "@/lib/api/wgw/contacts-set";

describe("contactCardSet mismatch handling", () => {
  it("throws ContactStateMismatchError on stateMismatch", () => {
    const response: ContactCardSetResponse = {
      created: {},
      updated: {},
      destroyed: [],
      notCreated: {},
      notUpdated: {
        "jane-doe": { type: "stateMismatch", description: "stale" },
      },
      notDestroyed: {},
    };
    expect(() => throwOnSetMismatch("jane-doe", response, "notUpdated")).toThrow(/stale/);
  });
});
