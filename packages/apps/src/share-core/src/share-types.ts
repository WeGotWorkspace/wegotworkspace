import type { DriveAPIOperations } from "@/drive-core/src/drive-types";
import type {
  WgwShareConfirmResult,
  WgwShareGrantPermission,
  WgwShareGrantRequestResult,
  WgwSharePublicMeta,
} from "@/lib/api/wgw/shares-types";

/** Source abstraction for the public share viewer (live HTTP vs mock). */
export type ShareApiSource = {
  loadMeta: (token: string, accessToken?: string | null) => Promise<WgwSharePublicMeta>;
  createOperations: (token: string) => DriveAPIOperations;
  requestAccess: (token: string, email: string) => Promise<WgwShareGrantRequestResult>;
  confirm: (inviteToken: string) => Promise<WgwShareConfirmResult>;
};

/** High-level screen state resolved by the share controller. */
export type ShareWorkspaceState =
  | { phase: "loading" }
  | { phase: "error"; message: string }
  | { phase: "needs-confirmation"; meta: WgwSharePublicMeta }
  | { phase: "confirming" }
  | { phase: "confirm-error"; message: string }
  | { phase: "confirm-success"; permission: WgwShareGrantPermission }
  | { phase: "viewer"; meta: WgwSharePublicMeta; operations: DriveAPIOperations };

export type ShareAccessRequestStatus = "idle" | "sending" | "sent" | "error";

export type ShareWorkspaceHandlers = {
  /** Submit an email to request access (sends a confirmation invite). */
  onRequestAccess: (email: string) => void;
  /** Continue from the confirm-success screen into the viewer. */
  onContinue: () => void;
  /** Retry after a load or confirmation failure. */
  onRetry: () => void;
};
