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
    "phone-1": { "@type": "Phone" as const, number: "+1-555-0101", contexts: { work: true } },
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

  it("builds create body with JSContact name components", () => {
    const draft = {
      ...emptyContactEditDraft(),
      nameGiven: "New",
      nameSurname: "Person",
      phones: [{ id: "phone-new", number: "+1-555-9999", contextType: "work" as const }],
      emails: [{ id: "email-new", address: "new@example.com", contextType: "" as const }],
    };
    const body = editDraftToCreateBody(draft, { default: true });
    expect(body).not.toHaveProperty("@type");
    expect(body).not.toHaveProperty("version");
    expect(body).not.toHaveProperty("id");
    expect(body.addressBookIds).toEqual({ default: true });
    expect(body.name).toEqual({
      isOrdered: false,
      components: [
        { kind: "given", value: "New" },
        { kind: "surname", value: "Person" },
      ],
      full: "",
    });
    expect(body.phones).toEqual({
      "phone-new": { number: "+1-555-9999", contexts: { work: true } },
    });
  });

  it("round-trips card to draft and builds patch for changed phone", () => {
    const draft = contactCardToEditDraft(janeCard);
    expect(draft.nameGiven).toBe("Jane");
    expect(draft.nameSurname).toBe("Doe");
    draft.phones = [{ id: "phone-1", number: "+1-555-0199", contextType: "work" }];
    const patch = editDraftToPatch(draft, janeCard);
    expect(patch.phones).toEqual({
      "phone-1": { number: "+1-555-0199", contexts: { work: true } },
    });
    expect(patch).not.toHaveProperty("@type");
  });

  it("builds notes patch with note key per OpenAPI JsContactNote", () => {
    const draft = contactCardToEditDraft(janeCard);
    draft.notes = "Updated note text";
    const patch = editDraftToPatch(draft, janeCard);
    expect(patch.notes).toEqual({ "note-1": { note: "Updated note text" } });
  });

  it("builds notes patch when adding a note to a card without notes", () => {
    const cardWithoutNotes = { ...janeCard, notes: undefined };
    const draft = contactCardToEditDraft(cardWithoutNotes);
    draft.notes = "Brand new note";
    const patch = editDraftToPatch(draft, cardWithoutNotes);
    expect(patch.notes).toBeDefined();
    const [noteId, noteEntry] = Object.entries(patch.notes ?? {})[0] ?? [];
    expect(noteId).toBeTruthy();
    expect(noteEntry).toEqual({ note: "Brand new note" });
  });

  it("builds structured address patch with JSContact components", () => {
    const cardWithAddress = {
      ...janeCard,
      addresses: {
        "addr-1": {
          "@type": "Address" as const,
          components: [
            { kind: "name" as const, value: "123 Main St" },
            { kind: "locality" as const, value: "Springfield" },
            { kind: "region" as const, value: "IL" },
            { kind: "postcode" as const, value: "62704" },
            { kind: "country" as const, value: "USA" },
          ],
          contexts: { private: true },
        },
      },
    } as unknown as ContactCard;
    const draft = contactCardToEditDraft(cardWithAddress);
    expect(draft.addresses[0]).toMatchObject({
      id: "addr-1",
      street: "123 Main St",
      locality: "Springfield",
      region: "IL",
      postalCode: "62704",
      country: "USA",
      contextType: "home",
    });
    draft.addresses = [
      {
        id: "addr-1",
        street: "456 Oak Ave",
        locality: "Shelbyville",
        region: "IL",
        postalCode: "62565",
        country: "USA",
        contextType: "home",
      },
    ];
    const patch = editDraftToPatch(draft, cardWithAddress);
    expect(patch.addresses).toEqual({
      "addr-1": {
        components: [
          { kind: "name", value: "456 Oak Ave" },
          { kind: "locality", value: "Shelbyville" },
          { kind: "region", value: "IL" },
          { kind: "postcode", value: "62565" },
          { kind: "country", value: "USA" },
        ],
        isOrdered: false,
        contexts: { private: true },
      },
    });
  });

  it("maps label-only address full to street in edit draft", () => {
    const cardWithLabelOnlyAddress = {
      ...janeCard,
      addresses: {
        "addr-1": { "@type": "Address" as const, full: "Main Street 123" },
      },
    } as unknown as ContactCard;
    const draft = contactCardToEditDraft(cardWithLabelOnlyAddress);
    expect(draft.addresses[0]?.street).toBe("Main Street 123");
  });

  it("builds create body with structured address components", () => {
    const draft = {
      ...emptyContactEditDraft(),
      addresses: [
        {
          id: "addr-new",
          street: "1 Example St",
          locality: "Amsterdam",
          region: "",
          postalCode: "1011",
          country: "Netherlands",
          contextType: "work" as const,
        },
      ],
    };
    const body = editDraftToCreateBody(draft, { default: true });
    expect(body.addresses).toEqual({
      "addr-new": {
        components: [
          { kind: "name", value: "1 Example St" },
          { kind: "locality", value: "Amsterdam" },
          { kind: "postcode", value: "1011" },
          { kind: "country", value: "Netherlands" },
        ],
        isOrdered: false,
        contexts: { work: true },
      },
    });
  });
});
