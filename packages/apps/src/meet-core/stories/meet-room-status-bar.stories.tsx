import type { Meta, StoryObj } from "@storybook/react-vite";
import { MeetRoomStatusBar } from "@/meet-core/src/meet-room-status-bar";
import {
  STORY_MEET_CALL_LINK,
  STORY_MEET_KNOCKERS,
} from "@/meet-core/stories/meet-pane-stories.fixtures";
import { meetRoomPaneDecorator } from "@/meet-core/stories/meet-panes.stories.decorator";
import {
  meetStoryParameters,
  STORY_NOOP,
  storyBooleanControl,
  storyNumberControl,
  storyTextControl,
} from "@/meet-core/stories/meet-story-shared";

const meta = {
  title: "Apps/Meet/Components/MeetRoomStatusBar",
  component: MeetRoomStatusBar,
  decorators: [meetRoomPaneDecorator],
  parameters: meetStoryParameters(),
  render: (args) => (
    <div className="p-4">
      <MeetRoomStatusBar {...args} />
    </div>
  ),
  argTypes: {
    elapsedLabel: storyTextControl,
    participantCount: storyNumberControl(1, 4),
    callLink: storyTextControl,
    showKnockers: storyBooleanControl,
    chatOpen: storyBooleanControl,
  },
} satisfies Meta<typeof MeetRoomStatusBar>;

export default meta;
type Story = StoryObj<typeof MeetRoomStatusBar>;

const baseArgs = {
  elapsedLabel: "02:14",
  participantCount: 3,
  callLink: STORY_MEET_CALL_LINK,
  knockers: STORY_MEET_KNOCKERS,
  showKnockers: true,
  chatOpen: false,
  onToggleChat: STORY_NOOP,
  onCopyLink: STORY_NOOP,
  onAdmitKnocker: STORY_NOOP,
  onDenyKnocker: STORY_NOOP,
};

export const InCall: Story = {
  name: "In call",
  args: baseArgs,
};

export const WithKnockers: Story = {
  name: "With knockers",
  args: { ...baseArgs, showKnockers: true },
};

export const ChatOpen: Story = {
  name: "Chat open",
  args: { ...baseArgs, showKnockers: false, chatOpen: true },
};

export const Alone: Story = {
  name: "Alone",
  args: {
    ...baseArgs,
    elapsedLabel: "00:42",
    participantCount: 1,
    showKnockers: false,
    knockers: [],
  },
};
