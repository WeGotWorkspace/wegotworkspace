import { confirmShareGrant, fetchSharePublicMeta, requestShareGrant } from "@/lib/api/wgw/shares";
import { createShareDriveOperations } from "@/share-core/src/share-operations";
import { getShareAccessToken } from "@/share-core/src/share-access-store";
import type { ShareApiSource } from "@/share-core/src/share-types";

/** Live HTTP source backed by the public `/shares/{token}` endpoints. */
export function createWgwShareApiSource(): ShareApiSource {
  return {
    loadMeta: (token, accessToken) =>
      fetchSharePublicMeta(token, accessToken ?? getShareAccessToken(token)),
    createOperations: (token) =>
      createShareDriveOperations(token, () => getShareAccessToken(token)),
    requestAccess: (token, email) => requestShareGrant(token, email),
    confirm: (inviteToken) => confirmShareGrant(inviteToken),
  };
}
