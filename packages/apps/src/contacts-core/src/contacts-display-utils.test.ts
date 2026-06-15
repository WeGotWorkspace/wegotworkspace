import { describe, expect, it } from "vitest";
import type { ContactCard } from "@/contacts-core/src/contacts-types";
import { defaultContactsLabels } from "./contacts-labels";
import {
  channelDisplayLabel,
  contactDisplayName,
  contactInitials,
  contactListSubtitle,
  filterCardsBySearch,
  mapEntriesSorted,
} from "./contacts-display-utils";

const janeCard = {
  "@type": "Card",
  version: "1.0",
  id: "card-jane",
  uid: "urn:uuid:jane-example",
  addressBookIds: { default: true as const },
  name: { "@type": "Name" as const, isOrdered: false, full: "Jane Doe" },
  organizations: {
    "org-1": { "@type": "Organization" as const, name: "Acme Corp" },
  },
  emails: {
    "email-1": { "@type": "EmailAddress" as const, address: "jane@example.com" },
  },
  phones: {
    "phone-1": { "@type": "Phone" as const, number: "+1-555-0101" },
  },
} as unknown as ContactCard;

const joeCard = {
  "@type": "Card",
  version: "1.0",
  id: "card-joe",
  uid: "urn:uuid:joe-example",
  addressBookIds: { work: true as const },
  name: {
    "@type": "Name" as const,
    isOrdered: false,
    components: [
      { "@type": "NameComponent" as const, kind: "given" as const, value: "Joe" },
      { "@type": "NameComponent" as const, kind: "surname" as const, value: "Example" },
    ],
  },
  emails: {
    "email-2": { "@type": "EmailAddress" as const, address: "joe@example.com" },
  },
} as unknown as ContactCard;

describe("contacts-display-utils", () => {
  it("derives display name from full or name components", () => {
    expect(contactDisplayName(janeCard)).toBe("Jane Doe");
    expect(contactDisplayName(joeCard)).toBe("Joe Example");
  });

  it("prefers organization, then email, then phone for list subtitles", () => {
    expect(contactListSubtitle(janeCard)).toBe("Acme Corp");

    const emailOnly: ContactCard = {
      ...joeCard,
      organizations: undefined,
    };
    expect(contactListSubtitle(emailOnly)).toBe("joe@example.com");

    const phoneOnly: ContactCard = {
      ...janeCard,
      organizations: undefined,
      emails: undefined,
    };
    expect(contactListSubtitle(phoneOnly)).toBe("+1-555-0101");
  });

  it("computes initials from a display name", () => {
    expect(contactInitials("Jane Doe")).toBe("JD");
    expect(contactInitials("Cher")).toBe("CH");
    expect(contactInitials("")).toBe("?");
  });

  it("sorts map entries by stable key order", () => {
    expect(mapEntriesSorted({ z: 1, a: 2, m: 3 })).toEqual([
      ["a", 2],
      ["m", 3],
      ["z", 1],
    ]);
  });

  it("filters cards by display name, email, and phone", () => {
    const cards = [janeCard, joeCard];
    expect(filterCardsBySearch(cards, "acme").map((card) => card.id)).toEqual(["card-jane"]);
    expect(filterCardsBySearch(cards, "555").map((card) => card.id)).toEqual(["card-jane"]);
    expect(filterCardsBySearch(cards, "joe@").map((card) => card.id)).toEqual(["card-joe"]);
    expect(filterCardsBySearch(cards, "")).toEqual(cards);
  });

  it("resolves channel display labels from phone contexts and custom labels", () => {
    const labels = defaultContactsLabels;
    expect(channelDisplayLabel({ private: true }, labels)).toBe("Home");
    expect(channelDisplayLabel({ home: true }, labels)).toBe("Home");
    expect(channelDisplayLabel({ work: true }, labels)).toBe("Work");
    expect(channelDisplayLabel({ school: true }, labels)).toBe("School");
    expect(channelDisplayLabel(undefined, labels, "  Assistant  ")).toBe("Assistant");
    expect(channelDisplayLabel({ voice: true }, labels)).toBeUndefined();
    expect(channelDisplayLabel(undefined, labels)).toBeUndefined();
  });
});
