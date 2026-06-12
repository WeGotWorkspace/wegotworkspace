import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { MeetRoomPane } from "@/meet-core/src/meet-room-pane";
import {
  MeetRoomPaneStory,
  type MeetRoomPaneStoryArgs,
} from "@/meet-core/stories/meet-story-renders";
import {
  meetStoryParameters,
  storyBooleanControl,
  storyNumberControl,
  storyTextControl,
} from "@/meet-core/stories/meet-story-shared";

/**
 * `MeetRoomPane` requires `MeetControllerState`. Render wrapper uses `MeetRoomPaneHarness`
 * with mock controller and fixture peers/knockers.
 */
const meta = {
  title: "Apps/Meet/Panes/MeetRoomPane",
  component: MeetRoomPane,
  render: (args) => <MeetRoomPaneStory {...args} />,
  parameters: {
    layout: "fullscreen",
    ...meetStoryParameters({
      componentDescription:
        "In-call room layout. Requires `MeetControllerState`; stories use `MeetRoomPaneHarness` with fixture peers.",
      snippet: `<MeetRoomPane
  controller={controller}
  displayName="Demo User"
  hasSignedInIdentity
  participantCount={3}
  chatOpen={false}
  callExitLabel={meetLabels.endCall}
  callExitTitle={meetLabels.endCallTitle}
  callExitDescription={meetLabels.endCallDescription}
  onToggleChat={toggleChat}
  onConfirmExit={confirmExit}
/>`,
    }),
  },
  argTypes: {
    displayName: storyTextControl,
    hasSignedInIdentity: storyBooleanControl,
    participantCount: storyNumberControl(1, 4),
    chatOpen: storyBooleanControl,
    screenOn: storyBooleanControl,
    peerCount: storyNumberControl(0, 2),
    showKnockers: storyBooleanControl,
    callExitMode: { control: "select", options: ["end", "leave"] as const },
  },
} satisfies Meta<MeetRoomPaneStoryArgs>;

export default meta;
type Story = StoryObj<MeetRoomPaneStoryArgs>;

const inCallBase: MeetRoomPaneStoryArgs = {
  displayName: "Demo User",
  hasSignedInIdentity: true,
  participantCount: 3,
  chatOpen: false,
  screenOn: false,
  peerCount: 2,
  showKnockers: false,
  callExitMode: "end",
};

export const WaitingAlone: Story = {
  name: "Waiting alone",
  args: {
    displayName: "Demo User",
    hasSignedInIdentity: true,
    participantCount: 1,
    chatOpen: false,
    screenOn: false,
    peerCount: 0,
    showKnockers: false,
    callExitMode: "end",
  },
};

export const WithPeers: Story = {
  name: "With peers",
  tags: ["vitest-ci"],
  args: inCallBase,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Show chat" }));
    await expect(canvas.getByRole("button", { name: "Hide chat" })).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "Hide chat" }));
    await expect(canvas.getByRole("button", { name: "Show chat" })).toBeInTheDocument();
  },
};

export const WithKnockers: Story = {
  name: "With knockers",
  args: {
    ...inCallBase,
    participantCount: 2,
    peerCount: 1,
    showKnockers: true,
  },
};

export const ScreenSharing: Story = {
  name: "Screen sharing",
  args: {
    ...inCallBase,
    screenOn: true,
  },
};

export const ChatOpen: Story = {
  name: "Chat open",
  args: {
    ...inCallBase,
    chatOpen: true,
  },
};

export const LeaveCall: Story = {
  name: "Leave call",
  args: {
    ...inCallBase,
    callExitMode: "leave",
  },
};
