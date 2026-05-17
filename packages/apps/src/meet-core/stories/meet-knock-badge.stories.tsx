import type { Meta, StoryObj } from "@storybook/react-vite";
import { MeetKnockBadge } from "@/meet-core/src/meet-knock-badge";
import { STORY_MEET_KNOCKERS } from "@/meet-core/stories/meet-pane-stories.fixtures";
import {
  meetStoryParameters,
  STORY_NOOP,
  renderInMeetScope,
} from "@/meet-core/stories/meet-story-shared";

const meta = {
  title: "Apps/Meet/Components/MeetKnockBadge",
  component: MeetKnockBadge,
  render: renderInMeetScope(MeetKnockBadge, "root"),
  parameters: meetStoryParameters(),
} satisfies Meta<typeof MeetKnockBadge>;

export default meta;
type Story = StoryObj<typeof MeetKnockBadge>;

export const OneGuest: Story = {
  name: "One guest",
  args: {
    knockers: [STORY_MEET_KNOCKERS[0]!],
    onAdmit: STORY_NOOP,
    onDeny: STORY_NOOP,
  },
};

export const MultipleGuests: Story = {
  name: "Multiple guests",
  args: {
    knockers: STORY_MEET_KNOCKERS,
    onAdmit: STORY_NOOP,
    onDeny: STORY_NOOP,
  },
};
