import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, within } from "storybook/test";
import { createMeetAppBootstrap } from "@/lib/api/mock/meet-bootstrap";
import {
  WorkspaceShellHeader,
  type WorkspaceShellHeaderProps,
} from "@/workspace-shell/src/workspace-shell-header";
import { MeetStoryScope } from "@/meet-core/stories/meet-story-scope";
import "@/login-core/src/login-screen.css";

const { session: signedInSession } = createMeetAppBootstrap();

const guestSession = {
  user: {
    displayName: "Guest",
    initials: "G",
  },
  viewerInboxLabel: "me",
} as const;

const STORY_NOOP = () => {};

const meta = {
  title: "Workspace/ShellHeader",
  component: WorkspaceShellHeader,
  parameters: {
    layout: "fullscreen",
    routerPath: "/meet",
  },
} satisfies Meta<typeof WorkspaceShellHeader>;

export default meta;
type Story = StoryObj<typeof WorkspaceShellHeader>;

function MeetDarkHeader(args: WorkspaceShellHeaderProps) {
  return (
    <MeetStoryScope>
      <WorkspaceShellHeader {...args} />
    </MeetStoryScope>
  );
}

export const MeetSignedIn: Story = {
  name: "Meet signed in",
  tags: ["vitest-ci"],
  render: MeetDarkHeader,
  args: {
    session: signedInSession,
    displayName: signedInSession.user.displayName,
    appSwitchDisabled: false,
    showUserAccount: true,
    onLogout: fn(),
  },
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Log out" }));
    await expect(args.onLogout).toHaveBeenCalledOnce();
  },
};

export const MeetGuestJoin: Story = {
  name: "Meet guest join",
  render: MeetDarkHeader,
  args: {
    session: guestSession,
    displayName: "Guest",
    appSwitchDisabled: true,
    showUserAccount: false,
    onLogout: STORY_NOOP,
  },
};

export const Login: Story = {
  name: "Login",
  render: (args) => (
    <main
      className="login-screen min-h-dvh"
      style={{ backgroundColor: "var(--color-paper)", color: "var(--color-forest)" }}
    >
      <WorkspaceShellHeader {...args} />
    </main>
  ),
  args: {
    appSwitchDisabled: true,
    appSwitchSubtitle: "Workspace",
  },
};
