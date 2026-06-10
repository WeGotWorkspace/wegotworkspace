import type { Meta, StoryObj } from "@storybook/react-vite";
import { createMeetAppBootstrap } from "@/lib/api/mock/meet-bootstrap";
import { MeetWorkspaceHeader } from "@/meet-core/src/meet-workspace-header";
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
  title: "Apps/Meet/Components/WorkspaceHeader",
  component: MeetWorkspaceHeader,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof MeetWorkspaceHeader>;

export default meta;
type Story = StoryObj<typeof MeetWorkspaceHeader>;

export const SignedIn: Story = {
  render: (args) => (
    <MeetStoryScope>
      <MeetWorkspaceHeader {...args} />
    </MeetStoryScope>
  ),
  args: {
    session: signedInSession,
    displayName: signedInSession.user.displayName,
    appSwitchDisabled: false,
    showUserAccount: true,
    onLogout: STORY_NOOP,
  },
};

export const GuestJoin: Story = {
  render: (args) => (
    <MeetStoryScope>
      <MeetWorkspaceHeader {...args} />
    </MeetStoryScope>
  ),
  args: {
    session: guestSession,
    displayName: "Guest",
    appSwitchDisabled: true,
    showUserAccount: false,
    onLogout: STORY_NOOP,
  },
};
