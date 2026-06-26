import type { Meta, StoryObj } from "@storybook/react-vite";
import { DriveShareDialog } from "@/drive-core/src/drive-share-dialog";
import {
  createMockShareOperations,
  makeMockGrant,
  makeMockShare,
} from "@/drive-core/src/drive-share-fixtures";

const target = {
  path: "/users/demo.user/Project Brief.md",
  name: "Project Brief.md",
  targetType: "file" as const,
};

const folderTarget = {
  path: "/users/demo.user/Designs",
  name: "Designs",
  targetType: "dir" as const,
};

const meta: Meta<typeof DriveShareDialog> = {
  title: "Apps/Drive/ShareDialog",
  component: DriveShareDialog,
  parameters: { layout: "centered" },
  args: {
    open: true,
    onOpenChange: () => {},
    target,
    origin: "https://app.example.com",
  },
};

export default meta;
type Story = StoryObj<typeof DriveShareDialog>;

/** No share exists yet — owner can create the link. */
export const NotShared: Story = {
  args: {
    operations: createMockShareOperations(),
  },
};

/** A public read-only link with no email invites. */
export const PublicRead: Story = {
  args: {
    operations: createMockShareOperations([
      makeMockShare({ path: target.path, name: target.name, publicAccess: "read" }),
    ]),
  },
};

/** Public write link with an expiry set. */
export const PublicWriteWithExpiry: Story = {
  args: {
    operations: createMockShareOperations([
      makeMockShare({
        path: target.path,
        name: target.name,
        publicAccess: "write",
        expiresAt: "2026-12-31T23:59:00.000Z",
      }),
    ]),
  },
};

/** Email-invited recipients showing pending / confirmed / revoked grant states. */
export const WithEmailGrants: Story = {
  args: {
    operations: createMockShareOperations([
      makeMockShare({
        path: target.path,
        name: target.name,
        publicAccess: "none",
        grants: [
          makeMockGrant({ email: "pending@example.com", permission: "read", status: "pending" }),
          makeMockGrant({
            email: "confirmed@example.com",
            permission: "write",
            status: "confirmed",
            confirmedAt: "2026-06-21T09:00:00.000Z",
          }),
          makeMockGrant({ email: "revoked@example.com", permission: "read", status: "revoked" }),
        ],
      }),
    ]),
  },
};

/** Sharing a folder rather than a single file. */
export const Folder: Story = {
  args: {
    target: folderTarget,
    operations: createMockShareOperations([
      makeMockShare({
        path: folderTarget.path,
        name: folderTarget.name,
        targetType: "dir",
        publicAccess: "read",
      }),
    ]),
  },
};

/** Preview / offline mode without operations — sharing is unavailable. */
export const Unavailable: Story = {
  args: {
    operations: undefined,
  },
};
