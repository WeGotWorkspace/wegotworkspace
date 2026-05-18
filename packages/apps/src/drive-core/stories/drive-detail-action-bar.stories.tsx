import type { Meta, StoryObj } from "@storybook/react-vite";
import { DriveDetailActionBar } from "@/drive-core/src/drive-detail-action-bar";
import { driveStoryLabels } from "@/drive-core/stories/drive-pane-stories.fixtures";
import {
  driveStoryParameters,
  STORY_NOOP,
  storyBooleanControl,
} from "@/drive-core/stories/drive-story-shared";
import { DriveStoryScope } from "@/drive-core/stories/drive-story-scope";

const meta = {
  title: "Apps/Drive/Components/DriveDetailActionBar",
  component: DriveDetailActionBar,
  tags: ["autodocs"],
  render: (args) => (
    <DriveStoryScope>
      <DriveDetailActionBar {...args} />
    </DriveStoryScope>
  ),
  parameters: driveStoryParameters({
    snippet: `<DriveDetailActionBar
  labels={driveLabels}
  isStarred={false}
  onClose={() => {}}
  onDownload={() => {}}
  onShare={() => {}}
  onStar={() => {}}
  onDelete={() => {}}
/>`,
  }),
  argTypes: {
    isStarred: storyBooleanControl,
    mobile: storyBooleanControl,
  },
} satisfies Meta<typeof DriveDetailActionBar>;

export default meta;
type Story = StoryObj<typeof DriveDetailActionBar>;

const base = {
  labels: driveStoryLabels,
  onClose: STORY_NOOP,
  onDownload: STORY_NOOP,
  onShare: STORY_NOOP,
  onStar: STORY_NOOP,
  onDelete: STORY_NOOP,
};

export const Default: Story = {
  args: {
    ...base,
    isStarred: false,
    mobile: false,
  },
};

export const Starred: Story = {
  args: {
    ...base,
    isStarred: true,
    mobile: false,
  },
};

export const Mobile: Story = {
  name: "Mobile",
  args: {
    ...base,
    isStarred: false,
    mobile: true,
  },
};
