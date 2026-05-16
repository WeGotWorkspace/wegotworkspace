import type { Meta, StoryObj } from "@storybook/react-vite";
import { MeetAvatar } from "@/meet-core/src/meet-avatar";
import { meetComponentPaneDecorator } from "@/meet-core/stories/meet-panes.stories.decorator";
import {
  meetStoryParameters,
  storyNumberControl,
  storyTextControl,
} from "@/meet-core/stories/meet-story-shared";

const meta = {
  title: "Apps/Meet/Components/MeetAvatar",
  component: MeetAvatar,
  decorators: [meetComponentPaneDecorator],
  parameters: meetStoryParameters(),
  argTypes: {
    name: storyTextControl,
    size: storyNumberControl(24, 120, 4),
  },
} satisfies Meta<typeof MeetAvatar>;

export default meta;
type Story = StoryObj<typeof MeetAvatar>;

export const LobbyPreview: Story = {
  name: "Lobby preview",
  args: { name: "Demo User", size: 84 },
};

export const Compact: Story = {
  name: "Compact",
  args: { name: "Alex Morgan", size: 40 },
};

export const PeerTile: Story = {
  name: "Peer tile",
  args: { name: "Jamie Lee", size: 80 },
};
