import type { Meta, StoryObj } from "@storybook/react-vite";
import { createMeetAppBootstrap } from "@/lib/api/mock/meet-bootstrap";
import { MeetWorkspaceHeader } from "@/meet-core/src/meet-workspace-header";
import {
  meetStoryParameters,
  STORY_NOOP,
  storyBooleanControl,
  storyTextControl,
} from "@/meet-core/stories/meet-story-shared";
import { MeetStoryScope } from "@/meet-core/stories/meet-story-scope";

const { session: signedInSession } = createMeetAppBootstrap();

const guestSession = {
  user: {
    displayName: "Guest",
    initials: "G",
  },
  viewerInboxLabel: "me",
} as const;

const meta = {
  title: "Apps/Meet/Components/MeetWorkspaceHeader",
  component: MeetWorkspaceHeader,
  render: (args) => (
    <MeetStoryScope>
      <MeetWorkspaceHeader {...args} />
    </MeetStoryScope>
  ),
  parameters: {
    layout: "fullscreen",
    ...meetStoryParameters(),
  },
  argTypes: {
    displayName: storyTextControl,
    disableAppSwitcher: storyBooleanControl,
    showUserAccount: storyBooleanControl,
  },
} satisfies Meta<typeof MeetWorkspaceHeader>;

export default meta;
type Story = StoryObj<typeof MeetWorkspaceHeader>;

export const SignedIn: Story = {
  name: "Signed in",
  args: {
    session: signedInSession,
    displayName: signedInSession.user.displayName,
    disableAppSwitcher: false,
    showUserAccount: true,
    onLogout: STORY_NOOP,
  },
};

export const GuestJoinFlow: Story = {
  name: "Guest join flow",
  args: {
    session: guestSession,
    displayName: "Guest",
    disableAppSwitcher: true,
    showUserAccount: false,
    onLogout: STORY_NOOP,
  },
};
