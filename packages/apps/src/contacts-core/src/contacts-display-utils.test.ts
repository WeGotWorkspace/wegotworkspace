import { describe, expect, it } from "vitest";
import type { ContactCard } from "@/contacts-core/src/contacts-types";
import { defaultContactsLabels } from "./contacts-labels";
import {
  channelDisplayLabel,
  contactDisplayName,
  contactInitials,
  contactListDetail,
  contactListSubtitle,
  contactPhotoUrl,
  CONTACT_MEDIA_BLOB_PATH,
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
    expect(contactListDetail(janeCard)).toBe("jane@example.com");

    const emailOnly: ContactCard = {
      ...joeCard,
      organizations: undefined,
    };
    expect(contactListSubtitle(emailOnly)).toBe("joe@example.com");
    expect(contactListDetail(emailOnly)).toBe("");

    const phoneOnly: ContactCard = {
      ...janeCard,
      organizations: undefined,
      emails: undefined,
    };
    expect(contactListSubtitle(phoneOnly)).toBe("+1-555-0101");
    expect(contactListDetail(phoneOnly)).toBe("");
  });

  it("does not repeat subtitle content in the list detail line", () => {
    const orgOnly: ContactCard = {
      ...janeCard,
      emails: undefined,
      phones: undefined,
    };
    expect(contactListSubtitle(orgOnly)).toBe("Acme Corp");
    expect(contactListDetail(orgOnly)).toBe("");
  });

  it("uses organization name for org cards without a person name", () => {
    const companyCard = {
      "@type": "Card",
      version: "1.0",
      id: "card-acme",
      uid: "urn:uuid:acme-example",
      kind: "org" as const,
      addressBookIds: { default: true as const },
      organizations: {
        "org-1": { "@type": "Organization" as const, name: "Acme Corp" },
      },
      emails: {
        "email-1": { "@type": "EmailAddress" as const, address: "info@acme.com" },
      },
      phones: {
        "phone-1": { "@type": "Phone" as const, number: "+1-555-0199" },
      },
    } as unknown as ContactCard;

    expect(contactDisplayName(companyCard)).toBe("Acme Corp");
    expect(contactListSubtitle(companyCard)).toBe("info@acme.com");
    expect(contactListDetail(companyCard)).toBe("+1-555-0199");
  });

  it("avoids repeating organization in subtitle when it is the display name", () => {
    const companyWithName = {
      ...janeCard,
      kind: "org" as const,
      name: { "@type": "Name" as const, isOrdered: false, full: "Acme Corp" },
    } as unknown as ContactCard;

    expect(contactDisplayName(companyWithName)).toBe("Acme Corp");
    expect(contactListSubtitle(companyWithName)).toBe("jane@example.com");
    expect(contactListDetail(companyWithName)).toBe("+1-555-0101");
  });

  it("computes initials from a display name", () => {
    expect(contactInitials("Jane Doe")).toBe("JD");
    expect(contactInitials("Cher")).toBe("CH");
    expect(contactInitials("")).toBe("?");
  });

  it("resolves photo URL from JSContact media map", () => {
    const withPhotoUri: ContactCard = {
      ...janeCard,
      media: {
        "media-1": {
          "@type": "Media" as const,
          kind: "photo" as const,
          uri: "https://example.com/photos/jane.jpg",
        },
      },
    };
    expect(contactPhotoUrl(withPhotoUri)).toBe("https://example.com/photos/jane.jpg");

    const withBlob: ContactCard = {
      ...janeCard,
      media: {
        "media-1": {
          "@type": "Media" as const,
          kind: "photo" as const,
          blobId: "550e8400-e29b-41d4-a716-446655440099",
        },
      },
    };
    expect(contactPhotoUrl(withBlob)).toBe(
      `${CONTACT_MEDIA_BLOB_PATH}/550e8400-e29b-41d4-a716-446655440099`,
    );

    const withDataUri: ContactCard = {
      ...janeCard,
      media: {
        "media-1": {
          "@type": "Media" as const,
          kind: "photo" as const,
          uri: "data:image/png;base64,abc",
        },
      },
    };
    expect(contactPhotoUrl(withDataUri)).toBe("data:image/png;base64,abc");

    expect(contactPhotoUrl(janeCard)).toBeUndefined();
  });

  it("prefers logo over photo for organization cards", () => {
    const orgCard = {
      ...janeCard,
      kind: "org" as const,
      media: {
        "media-logo": {
          "@type": "Media" as const,
          kind: "logo" as const,
          uri: "https://example.com/logo.png",
        },
        "media-photo": {
          "@type": "Media" as const,
          kind: "photo" as const,
          uri: "https://example.com/photo.jpg",
        },
      },
    } as unknown as ContactCard;

    expect(contactPhotoUrl(orgCard)).toBe("https://example.com/logo.png");
  });

  it("prefers photo over logo for person cards", () => {
    const personCard = {
      ...janeCard,
      media: {
        "media-logo": {
          "@type": "Media" as const,
          kind: "logo" as const,
          uri: "https://example.com/logo.png",
        },
        "media-photo": {
          "@type": "Media" as const,
          kind: "photo" as const,
          uri: "https://example.com/photo.jpg",
        },
      },
    } as unknown as ContactCard;

    expect(contactPhotoUrl(personCard)).toBe("https://example.com/photo.jpg");
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
