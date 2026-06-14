import { describe, expect, it } from "vitest";
import type { ContactCard } from "@/contacts-core/src/contacts-types";
import {
  contactCardToEditDraft,
  editDraftToCreateBody,
  editDraftToPatch,
  emptyContactEditDraft,
  resolveCreateAddressBookIds,
  resolveDefaultContactsView,
} from "./contacts-edit-utils";

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
  notes: {
    "note-1": { "@type": "Note" as const, note: "Met at conference" },
  },
} as unknown as ContactCard;

describe("contacts-edit-utils", () => {
  it("resolves default view from isDefault book, else first book, else all", () => {
    expect(
      resolveDefaultContactsView([
        { id: "work", name: "Work", isDefault: false } as never,
        { id: "default", name: "Default", isDefault: true } as never,
      ]),
    ).toBe("book:default");
    expect(
      resolveDefaultContactsView([{ id: "work", name: "Work", isDefault: false } as never]),
    ).toBe("book:work");
    expect(resolveDefaultContactsView([])).toBe("all");
  });

  it("maps create address book ids from active book or default", () => {
    const books = [
      { id: "default", name: "Default", isDefault: true } as never,
      { id: "work", name: "Work", isDefault: false } as never,
    ];
    expect(resolveCreateAddressBookIds("book:work", books)).toEqual({ work: true });
    expect(resolveCreateAddressBookIds("all", books)).toEqual({ default: true });
  });

  it("builds create body without server-owned envelope fields", () => {
    const draft = {
      ...emptyContactEditDraft(),
      nameFull: "New Person",
      phones: [{ id: "phone-new", number: "+1-555-9999" }],
      emails: [{ id: "email-new", address: "new@example.com" }],
    };
    const body = editDraftToCreateBody(draft, { default: true });
    expect(body).not.toHaveProperty("@type");
    expect(body).not.toHaveProperty("version");
    expect(body).not.toHaveProperty("id");
    expect(body.addressBookIds).toEqual({ default: true });
    expect(body.name).toEqual({ full: "New Person" });
    expect(body.phones).toEqual({ "phone-new": { number: "+1-555-9999" } });
  });

  it("round-trips card to draft and builds patch for changed phone", () => {
    const draft = contactCardToEditDraft(janeCard);
    draft.phones = [{ id: "phone-1", number: "+1-555-0199" }];
    const patch = editDraftToPatch(draft, janeCard);
    expect(patch.phones).toEqual({ "phone-1": { number: "+1-555-0199" } });
    expect(patch).not.toHaveProperty("@type");
  });
});
