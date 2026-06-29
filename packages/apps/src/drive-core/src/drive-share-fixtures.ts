/** In-memory {@link DriveShareOperations} for Storybook (mock tier) and Vitest. */
import type { DriveShareOperations } from "@/drive-core/src/drive-types";
import type { WgwShare, WgwShareGrant } from "@/lib/api/wgw/shares-types";

let counter = 0;
const nextId = (prefix: string) => `${prefix}-${(counter += 1)}`;

export function makeMockShare(overrides: Partial<WgwShare> = {}): WgwShare {
  const token = overrides.token ?? "tok_demo123";
  return {
    id: overrides.id ?? "shr_demo",
    token,
    path: overrides.path ?? "/users/demo.user/Project Brief.md",
    name: overrides.name ?? "Project Brief.md",
    targetType: overrides.targetType ?? "file",
    publicAccess: overrides.publicAccess ?? "none",
    expiresAt: overrides.expiresAt ?? null,
    url: overrides.url ?? `https://app.example.com/s/${token}`,
    createdAt: overrides.createdAt ?? "2026-06-20T10:00:00.000Z",
    grants: overrides.grants ?? [],
  };
}

export function makeMockGrant(overrides: Partial<WgwShareGrant> = {}): WgwShareGrant {
  return {
    id: overrides.id ?? nextId("grant"),
    email: overrides.email ?? "guest@example.com",
    permission: overrides.permission ?? "read",
    status: overrides.status ?? "pending",
    confirmedAt: overrides.confirmedAt ?? null,
  };
}

/**
 * Build a stateful mock of the owner sharing operations seeded with `initial` shares,
 * keyed by their `path`. All mutations resolve against the in-memory store.
 */
export function createMockShareOperations(initial: WgwShare[] = []): DriveShareOperations {
  const store = new Map<string, WgwShare>();
  for (const share of initial) store.set(share.path, share);

  const findById = (shareId: string): WgwShare | undefined =>
    [...store.values()].find((share) => share.id === shareId);

  return {
    listShares: async (path) => [...store.values()].filter((share) => share.path === path),
    createShare: async (input) => {
      const created = makeMockShare({
        id: nextId("shr"),
        token: nextId("tok"),
        path: input.path,
        name: input.path.split("/").pop() ?? input.path,
        publicAccess: input.publicAccess,
        expiresAt: input.expiresAt ?? null,
        url: `https://app.example.com/s/${nextId("tok")}`,
        grants: [],
      });
      store.set(created.path, created);
      return created;
    },
    updateShare: async ({ shareId, ...patch }) => {
      const share = findById(shareId);
      if (!share) throw new Error("Share not found");
      const next: WgwShare = {
        ...share,
        publicAccess: patch.publicAccess ?? share.publicAccess,
        expiresAt: patch.expiresAt !== undefined ? patch.expiresAt : share.expiresAt,
      };
      store.set(next.path, next);
      return next;
    },
    revokeShare: async (shareId) => {
      const share = findById(shareId);
      if (share) store.delete(share.path);
    },
    addShareGrants: async ({ shareId, emails, permission }) => {
      const share = findById(shareId);
      if (!share) throw new Error("Share not found");
      const grants = [
        ...share.grants,
        ...emails.map((email) => makeMockGrant({ email, permission, status: "pending" })),
      ];
      const next = { ...share, grants };
      store.set(next.path, next);
      return next;
    },
    removeShareGrant: async ({ shareId, grantId }) => {
      const share = findById(shareId);
      if (!share) throw new Error("Share not found");
      const next = {
        ...share,
        grants: share.grants.filter((grant) => grant.id !== grantId),
      };
      store.set(next.path, next);
      return next;
    },
  };
}
