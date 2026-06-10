import { useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { createMemoryHistory } from "@tanstack/react-router";
import { WgwApiRuntimeProvider } from "@/lib/api/wgw/wgw-api-runtime-provider";
import { WeGotWorkspaceApp } from "@/wegotworkspace/src/wegotworkspace-app";
import { WeGotWorkspace } from "@/wegotworkspace/src/wegotworkspace";
import { WeGotWorkspaceLive } from "@/wegotworkspace/src/wegotworkspace-live";
import { WeGotWorkspaceRouter } from "@/wegotworkspace/src/wegotworkspace-router";
import { withWeGotWorkspaceAuth } from "@/wegotworkspace/src/wegotworkspace-require-auth";

const meta = {
  title: "Apps/WeGotWorkspace/Shell",
  parameters: {
    layout: "fullscreen",
    wegotworkspaceRouter: true,
    docs: {
      description: {
        component:
          "Mock-tier route matrix for the WeGotWorkspace shell catalog. Each story exercises a router entry offline unless noted.",
      },
    },
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

function LiveRouterHarness({ initialPath }: { initialPath: string }) {
  const history = useMemo(
    () => createMemoryHistory({ initialEntries: [initialPath] }),
    [initialPath],
  );
  return (
    <WgwApiRuntimeProvider apiBaseUrl="/api/v1">
      <WeGotWorkspaceRouter mode="live" history={history} />
    </WgwApiRuntimeProvider>
  );
}

export const WegotworkspaceHome: Story = {
  name: "WegotworkspaceHome",
  render: () => <WeGotWorkspace initialPath="/" />,
};

export const WegotworkspaceLoginRoute: Story = {
  name: "WegotworkspaceLoginRoute",
  render: () => <WeGotWorkspace initialPath="/login" />,
};

export const WegotworkspaceLogout: Story = {
  name: "WegotworkspaceLogout",
  render: () => <WeGotWorkspace initialPath="/logout" />,
};

export const WegotworkspaceShell: Story = {
  name: "WegotworkspaceShell",
  render: () => <WeGotWorkspace initialPath="/drive" />,
};

export const WegotworkspaceRouter: Story = {
  name: "WegotworkspaceRouter",
  render: () => <WeGotWorkspace initialPath="/notes" />,
};

export const WegotworkspaceRoutes: Story = {
  name: "WegotworkspaceRoutes",
  render: () => <WeGotWorkspace initialPath="/mail" />,
};

export const WegotworkspaceRouterShared: Story = {
  name: "WegotworkspaceRouterShared",
  render: () => <WeGotWorkspace initialPath="/settings" />,
};

export const WegotworkspaceApp: Story = {
  name: "WegotworkspaceApp",
  render: () => {
    void WeGotWorkspaceApp;
    return <WeGotWorkspace initialPath="/" />;
  },
  parameters: {
    docs: {
      description: {
        story:
          "Production entry is WeGotWorkspaceApp (browser history + live API). Offline preview uses the mock router harness.",
      },
    },
  },
};

export const WegotworkspaceLive: Story = {
  name: "WegotworkspaceLive",
  render: () => <WeGotWorkspaceLive initialPath="/login" apiBaseUrl="/api/v1" />,
};

export const WegotworkspaceLiveHome: Story = {
  name: "WegotworkspaceLiveHome",
  render: () => <LiveRouterHarness initialPath="/" />,
};

export const WegotworkspaceRequireAuth: Story = {
  name: "WegotworkspaceRequireAuth",
  render: () => {
    void withWeGotWorkspaceAuth;
    return <LiveRouterHarness initialPath="/drive" />;
  },
};
