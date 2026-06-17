import { beforeEach, describe, expect, it, vi } from "vitest";
import { deleteCardWithState, patchCardWithState } from "@/lib/api/wgw/contacts-mutations";

vi.mock("@/lib/api/wgw/contacts-set", () => ({
  patchCardViaSet: vi.fn(async () => ({ cardId: "jane-doe", newState: "state-2" })),
  deleteCardViaSet: vi.fn(async () => undefined),
  createCardViaSet: vi.fn(),
}));

vi.mock("@/lib/api/wgw/contacts", () => ({
  getCard: vi.fn(async () => ({
    id: "jane-doe",
    "@type": "Card",
    version: "1.0",
    uid: "urn:uuid:jane",
    addressBookIds: { default: true },
    state: "state-2",
  })),
}));

import { deleteCardViaSet, patchCardViaSet } from "@/lib/api/wgw/contacts-set";

describe("contacts-mutations ifInState", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("passes JMAP state as ifInState on patch", async () => {
    await patchCardWithState("jane-doe", { name: { full: "Jane" } }, { ifInState: "state-1" });

    expect(patchCardViaSet).toHaveBeenCalledWith(
      "jane-doe",
      { name: { full: "Jane" } },
      expect.objectContaining({ ifInState: "state-1" }),
    );
  });

  it("does not send CardDAV etag as ifInState on patch", async () => {
    await patchCardWithState(
      "jane-doe",
      { name: { full: "Jane" } },
      { ifMatch: '"2417a1ecf9580581d943b571cea83499"' },
    );

    expect(patchCardViaSet).toHaveBeenCalledWith(
      "jane-doe",
      { name: { full: "Jane" } },
      expect.objectContaining({ ifInState: undefined }),
    );
  });

  it("does not send CardDAV etag as ifInState on delete", async () => {
    await deleteCardWithState("jane-doe", { ifMatch: '"2417a1ecf9580581d943b571cea83499"' });

    expect(deleteCardViaSet).toHaveBeenCalledWith(
      "jane-doe",
      expect.objectContaining({ ifInState: undefined }),
    );
  });
});
