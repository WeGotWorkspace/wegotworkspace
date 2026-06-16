import { describe, expect, it } from "vitest";
import {
  contactsContactFromParams,
  contactsViewFromParams,
} from "@/contacts-core/src/contacts-route-search";

describe("contacts-route-search", () => {
  it("maps all-contacts paths to the all view", () => {
    expect(contactsViewFromParams({})).toBe("all");
    expect(contactsContactFromParams({})).toBe("");
    expect(contactsContactFromParams({ contactId: "card-jane" })).toBe("card-jane");
  });

  it("maps group paths to group:{groupCardId} view and optional contact id", () => {
    expect(contactsViewFromParams({ groupCardId: "card-group-friends" })).toBe(
      "group:card-group-friends",
    );
    expect(
      contactsContactFromParams({
        contactId: "ddeec682-7526-42ea-8e4e-ce0e72b26e70",
      }),
    ).toBe("ddeec682-7526-42ea-8e4e-ce0e72b26e70");
  });
});
