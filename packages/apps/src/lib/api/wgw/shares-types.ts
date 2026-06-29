/**
 * File-sharing API shapes for `/api/v1/files/shares` (owner) and `/api/v1/shares/{token}`
 * (public recipient). Backed by the generated OpenAPI schemas; do not hand-edit those.
 */
import type { components } from "@wgw-api-generated/openapi-types";

type Schemas = components["schemas"];

export type WgwSharePublicAccess = "none" | "read" | "write";
export type WgwShareTargetType = "file" | "dir";
export type WgwShareGrantPermission = "read" | "write";
export type WgwShareGrantStatus = "pending" | "confirmed" | "revoked";

export type WgwShareGrant = Schemas["ShareGrant"];
export type WgwShare = Schemas["Share"];

export type WgwShareCreateInput = {
  path: string;
  publicAccess: WgwSharePublicAccess;
  expiresAt?: string | null;
};

export type WgwShareUpdateInput = {
  publicAccess?: WgwSharePublicAccess;
  expiresAt?: string | null;
};

export type WgwShareGrantsInput = {
  emails: string[];
  permission: WgwShareGrantPermission;
};

/** Effective metadata returned by `GET /shares/{token}` for the presented credential. */
export type WgwSharePublicMeta = Schemas["SharePublicMetadataResponse"]["data"];

/** A single child entry (path is relative to the share root). */
export type WgwShareEntry = Schemas["ShareEntry"];

export type WgwShareChildren = Schemas["ShareChildrenResponse"]["data"];

export type WgwShareGrantRequestResult = Schemas["ShareGrantRequestResponse"]["data"];

export type WgwShareConfirmResult = Schemas["ShareConfirmResponse"]["data"];
