import type {
  ContactCard,
  ContactCardCreate,
  ContactCardPatch,
} from "@/contacts-core/src/contacts-types";
import { ContactsRequestError } from "@/lib/api/wgw/contacts";
import { wgwFetch, wgwReadJson } from "@/lib/api/wgw/http";

export type ContactCardSetResponse = {
  created: Record<string, string>;
  updated: Record<string, string>;
  destroyed: string[];
  notCreated: Record<string, { type: string; description: string }>;
  notUpdated: Record<string, { type: string; description: string }>;
  notDestroyed: Record<string, { type: string; description: string }>;
};

export class ContactStateMismatchError extends Error {
  cardId: string;

  constructor(cardId: string, message = "Contact state mismatch") {
    super(message);
    this.cardId = cardId;
  }
}

export async function contactCardSet(
  body: {
    create?: Record<string, ContactCardCreate>;
    update?: Record<string, ContactCardPatch & { ifInState?: string }>;
    destroy?: string[] | Record<string, { ifInState?: string }>;
  },
  opts?: { signal?: AbortSignal },
): Promise<ContactCardSetResponse> {
  const res = await wgwFetch("/contacts/cards/set", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal: opts?.signal,
  });
  if (!res.ok) {
    throw new ContactsRequestError(`POST /contacts/cards/set failed (${res.status})`, res.status);
  }
  return (await wgwReadJson(res)) as ContactCardSetResponse;
}

export function throwOnSetMismatch(
  cardId: string,
  response: ContactCardSetResponse,
  bucket: "notUpdated" | "notDestroyed",
): void {
  const err = response[bucket][cardId];
  if (err?.type === "stateMismatch") {
    throw new ContactStateMismatchError(cardId, err.description);
  }
  if (err) {
    throw new Error(err.description || err.type);
  }
}

export async function patchCardViaSet(
  cardId: string,
  patch: ContactCardPatch,
  opts?: { signal?: AbortSignal; ifInState?: string },
): Promise<{ cardId: string; newState: string }> {
  const updatePayload: ContactCardPatch & { ifInState?: string } = { ...patch };
  if (opts?.ifInState) {
    updatePayload.ifInState = opts.ifInState;
  }
  const response = await contactCardSet(
    { update: { [cardId]: updatePayload } },
    { signal: opts?.signal },
  );
  throwOnSetMismatch(cardId, response, "notUpdated");
  const newState = response.updated[cardId];
  if (!newState) {
    throw new Error("Contact/set update did not return new state");
  }
  return { cardId, newState };
}

export async function deleteCardViaSet(
  cardId: string,
  opts?: { signal?: AbortSignal; ifInState?: string },
): Promise<void> {
  const destroy = opts?.ifInState ? { [cardId]: { ifInState: opts.ifInState } } : [cardId];
  const response = await contactCardSet({ destroy }, { signal: opts?.signal });
  if (Array.isArray(destroy)) {
    if (!response.destroyed.includes(cardId) && response.notDestroyed[cardId]) {
      throwOnSetMismatch(cardId, response, "notDestroyed");
    }
    return;
  }
  throwOnSetMismatch(cardId, response, "notDestroyed");
}

export async function createCardViaSet(
  creationId: string,
  body: ContactCardCreate,
  opts?: { signal?: AbortSignal },
): Promise<ContactCard> {
  const response = await contactCardSet(
    { create: { [creationId]: body } },
    { signal: opts?.signal },
  );
  const serverId = response.created[creationId];
  if (!serverId) {
    const err = response.notCreated[creationId];
    throw new Error(err?.description ?? "Contact create failed");
  }
  const res = await wgwFetch(`/contacts/cards/${encodeURIComponent(serverId)}`, {
    signal: opts?.signal,
  });
  if (!res.ok) {
    throw new ContactsRequestError(
      `GET /contacts/cards/${serverId} failed (${res.status})`,
      res.status,
    );
  }
  return (await wgwReadJson(res)) as ContactCard;
}
