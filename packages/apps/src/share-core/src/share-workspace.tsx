import { ShareViewer } from "@/share-core/src/share-viewer";
import { ShareAccessRequest } from "@/share-core/src/share-access-request";
import {
  ShareConfirmingScreen,
  ShareConfirmSuccessScreen,
  ShareErrorScreen,
  ShareLoadingScreen,
} from "@/share-core/src/share-status-screens";
import { shareLabels } from "@/share-core/src/share-labels";
import type {
  ShareAccessRequestStatus,
  ShareWorkspaceHandlers,
  ShareWorkspaceState,
} from "@/share-core/src/share-types";

export type ShareWorkspaceProps = {
  state: ShareWorkspaceState;
  handlers: ShareWorkspaceHandlers;
  accessRequestStatus: ShareAccessRequestStatus;
};

/** Renders the correct public share screen for the resolved {@link ShareWorkspaceState}. */
export function ShareWorkspace({ state, handlers, accessRequestStatus }: ShareWorkspaceProps) {
  switch (state.phase) {
    case "loading":
      return <ShareLoadingScreen />;
    case "error":
      return <ShareErrorScreen message={state.message} onRetry={handlers.onRetry} />;
    case "needs-confirmation":
      return (
        <ShareAccessRequest
          meta={state.meta}
          status={accessRequestStatus}
          onRequestAccess={handlers.onRequestAccess}
        />
      );
    case "confirming":
      return <ShareConfirmingScreen />;
    case "confirm-error":
      return (
        <ShareErrorScreen
          title={shareLabels.confirmErrorTitle}
          message={state.message}
          onRetry={handlers.onRetry}
        />
      );
    case "confirm-success":
      return (
        <ShareConfirmSuccessScreen permission={state.permission} onContinue={handlers.onContinue} />
      );
    case "viewer":
      return <ShareViewer meta={state.meta} operations={state.operations} />;
    default:
      return null;
  }
}
