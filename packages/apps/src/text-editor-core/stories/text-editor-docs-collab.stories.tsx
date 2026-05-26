import type { Meta, StoryObj } from "@storybook/react-vite";
import { DocsCollabWorkspace } from "@/text-editor-core/docs-collab";

import "@/text-editor-core/src/text-editor.css";

const devUser = (import.meta.env.VITE_WGW_DEV_USERNAME as string | undefined) ?? "admin";
const devPassword =
  (import.meta.env.VITE_WGW_DEV_PASSWORD as string | undefined) ?? "storybook-dev";
const liveApiOrigin =
  (import.meta.env.VITE_WGW_LIVE_ORIGIN as string | undefined)?.trim() ||
  "https://wegotworkspace.dev";
const defaultRoom = "/users/admin/docs-collab-room.md";
const documentBase = `${liveApiOrigin}/api/v1/collab/document`;

const storyDescription = `
Collaborative markdown editing over the final docs-collab endpoints.

- Signaling: \`/api/v1/collab/join|poll|send|leave\`
- Document: \`/api/v1/collab/document\`
- Sync: Yjs over WebRTC data channels.

### Run

1. \`pnpm dev:ui\` (Storybook on :6006)
2. Ensure \`.env.local\` has valid \`VITE_WGW_DEV_USERNAME\`, \`VITE_WGW_DEV_PASSWORD\`, and \`VITE_WGW_LIVE_ORIGIN\`.
3. Open this story in two windows with different names to test collaboration.
`;

const meta = {
  title: "Shared/TextEditor/Docs collab",
  component: DocsCollabWorkspace,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
    docs: {
      description: {
        component: storyDescription,
      },
    },
  },
} satisfies Meta<typeof DocsCollabWorkspace>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Collab: Story = {};

export const CollabLaravelFinalApiAuth: Story = {
  args: {
    userName: "Admin User",
    urls: {
      signalUrl: `${liveApiOrigin}/api/v1/collab/send`,
      collabApiBaseUrl: `${liveApiOrigin}/api/v1/collab`,
      authTokenUrl: `${liveApiOrigin}/api/v1/auth/token`,
      authUser: devUser,
      authPassword: devPassword,
      documentUrl: `${documentBase}?room=${encodeURIComponent(defaultRoom)}`,
      yjsUrl: `${documentBase}?room=${encodeURIComponent(defaultRoom)}&format=yjs`,
      documentSaveMethod: "PUT",
      room: defaultRoom,
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Steps 2.5+2.6 cutover: signaling uses final `/collab/join|poll|send|leave` endpoints " +
          "and document persistence uses `/collab/document` (GET/PUT) with JWT auth.",
      },
    },
  },
};

const isolatedRoom = "/users/admin/docs-collab-room-isolated.md";

export const CollabLaravelFinalApiAuthIsolatedRoom: Story = {
  args: {
    urls: {
      signalUrl: `${liveApiOrigin}/api/v1/collab/send`,
      collabApiBaseUrl: `${liveApiOrigin}/api/v1/collab`,
      authTokenUrl: `${liveApiOrigin}/api/v1/auth/token`,
      authUser: devUser,
      authPassword: devPassword,
      documentUrl: `${documentBase}?room=${encodeURIComponent(isolatedRoom)}`,
      yjsUrl: `${documentBase}?room=${encodeURIComponent(isolatedRoom)}&format=yjs`,
      documentSaveMethod: "PUT",
      room: isolatedRoom,
    },
  },
  parameters: {
    docs: {
      description: {
        story:
          "Step 2.4 room isolation audit: this story uses the final APIs with a different room. " +
          "Tabs opened on this story should sync with each other but stay isolated from `docs-collab-room.md`.",
      },
    },
  },
};
