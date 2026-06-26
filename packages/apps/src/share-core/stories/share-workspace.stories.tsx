import type { Meta, StoryObj } from "@storybook/react-vite";
import { ShareWorkspace } from "@/share-core/src/share-workspace";
import {
  createMockShareOperations,
  makeMockSharePublicMeta,
} from "@/share-core/src/share-fixtures";

const handlers = {
  onRequestAccess: () => {},
  onContinue: () => {},
  onRetry: () => {},
};

const meta: Meta<typeof ShareWorkspace> = {
  title: "Apps/Share/Workspace",
  component: ShareWorkspace,
  parameters: { layout: "fullscreen" },
  args: { handlers, accessRequestStatus: "idle" },
};

export default meta;
type Story = StoryObj<typeof ShareWorkspace>;

export const Loading: Story = {
  args: { state: { phase: "loading" } },
};

export const NeedsConfirmation: Story = {
  args: {
    state: {
      phase: "needs-confirmation",
      meta: makeMockSharePublicMeta({ permission: "none", requiresConfirmation: true }),
    },
  },
};

export const RequestSent: Story = {
  args: {
    accessRequestStatus: "sent",
    state: {
      phase: "needs-confirmation",
      meta: makeMockSharePublicMeta({ permission: "none", requiresConfirmation: true }),
    },
  },
};

export const Confirming: Story = {
  args: { state: { phase: "confirming" } },
};

export const ConfirmSuccess: Story = {
  args: { state: { phase: "confirm-success", permission: "write" } },
};

export const ConfirmError: Story = {
  args: {
    state: { phase: "confirm-error", message: "This invite link has expired." },
  },
};

export const ErrorState: Story = {
  args: {
    state: { phase: "error", message: "This share link is no longer available." },
  },
};

export const PublicReadDirectory: Story = {
  args: {
    state: {
      phase: "viewer",
      meta: makeMockSharePublicMeta({ permission: "read", publicAccess: "read" }),
      operations: createMockShareOperations(),
    },
  },
};

export const PublicWriteDirectory: Story = {
  args: {
    state: {
      phase: "viewer",
      meta: makeMockSharePublicMeta({ permission: "write", publicAccess: "write" }),
      operations: createMockShareOperations(),
    },
  },
};

export const SingleFile: Story = {
  args: {
    state: {
      phase: "viewer",
      meta: makeMockSharePublicMeta({
        name: "design-spec.pdf",
        targetType: "file",
        permission: "read",
        publicAccess: "read",
      }),
      operations: createMockShareOperations(),
    },
  },
};
