import type { Meta, StoryObj } from "@storybook/react-vite";
import { WeGotWorkspace } from "@/wegotworkspace/src/wegotworkspace";
import {
  WeGotWorkspaceLive,
  type WeGotWorkspaceLiveProps,
} from "@/wegotworkspace/src/wegotworkspace-live";

const defaultLiveApiBaseUrl =
  (import.meta.env.VITE_WGW_API_BASE_URL as string | undefined)?.trim() || "/api/v1";

const liveApiStoryDescription =
  "Uses the PHP dev API via Storybook proxy (`/api/v1` → `WGW_PROXY_TARGET`). " +
  "Run `pnpm setup:storybook-live-api` once, then `pnpm dev` (or `pnpm dev:api` for API only). " +
  "Restart Storybook after changing `.env.local`.";

const meta: Meta<typeof WeGotWorkspace> = {
  title: "Apps/WeGotWorkspace",
  component: WeGotWorkspace,
  parameters: {
    layout: "fullscreen",
    wegotworkspaceRouter: true,
    docs: {
      description: {
        component:
          "Mock shell for offline stories (`Default`, `Installer`). " +
          "For the real API, open **Live API** or **Live Docs** (see stories below).",
      },
    },
  },
};

export default meta;
type Story = StoryObj<typeof WeGotWorkspace>;

export const Default: Story = {
  args: {
    initialPath: "/login",
  },
};

export const Installer: Story = {
  name: "Installer",
  args: {
    initialPath: "/install",
  },
};

const liveApiStory = {
  render: (args: WeGotWorkspaceLiveProps) => <WeGotWorkspaceLive {...args} />,
  args: {
    apiBaseUrl: defaultLiveApiBaseUrl,
  },
  argTypes: {
    apiBaseUrl: { control: "text" },
    initialPath: { control: "text" },
  },
  parameters: {
    docs: {
      description: {
        story: liveApiStoryDescription,
      },
    },
  },
} satisfies Pick<StoryObj<WeGotWorkspaceLiveProps>, "render" | "args" | "argTypes" | "parameters">;

export const LiveApi: StoryObj<WeGotWorkspaceLiveProps> = {
  name: "Live API",
  tags: ["!test", "live"],
  ...liveApiStory,
  args: {
    ...liveApiStory.args,
    initialPath: "/login",
  },
};

export const LiveDocs: StoryObj<WeGotWorkspaceLiveProps> = {
  name: "Live Docs",
  tags: ["!test", "live"],
  ...liveApiStory,
  args: {
    ...liveApiStory.args,
    initialPath: "/docs",
  },
  parameters: {
    docs: {
      description: {
        story: `${liveApiStoryDescription} Opens the Docs app route directly.`,
      },
    },
  },
};
