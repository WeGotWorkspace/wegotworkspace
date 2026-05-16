import type { Meta, StoryObj } from "@storybook/react-vite";
import { MeetPeerTile } from "@/meet-core/src/meet-peer-tile";
import { meetRoomPaneDecorator } from "@/meet-core/stories/meet-panes.stories.decorator";
import {
  meetStoryParameters,
  STORY_NOOP,
  storyBooleanControl,
  storyTextControl,
} from "@/meet-core/stories/meet-story-shared";

const meta = {
  title: "Apps/Meet/Components/MeetPeerTile",
  component: MeetPeerTile,
  decorators: [meetRoomPaneDecorator],
  parameters: meetStoryParameters(),
  render: (args) => (
    <div className="grid h-[min(70dvh,28rem)] max-w-3xl gap-4 p-6">
      <MeetPeerTile {...args} />
    </div>
  ),
  argTypes: {
    name: storyTextControl,
    compact: storyBooleanControl,
  },
} satisfies Meta<typeof MeetPeerTile>;

export default meta;
type Story = StoryObj<typeof MeetPeerTile>;

export const NoVideo: Story = {
  name: "No video",
  args: {
    name: "Alex Morgan",
    stream: null,
    compact: false,
    onMuteSoon: STORY_NOOP,
  },
};

export const CompactStrip: Story = {
  name: "Compact strip",
  args: {
    name: "Jamie Lee",
    stream: null,
    compact: true,
    onMuteSoon: STORY_NOOP,
  },
};
