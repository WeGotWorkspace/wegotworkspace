import type { Meta, StoryObj } from "@storybook/react-vite";
import { AdminMeetPane } from "@/admin-core/src/admin-meet-pane";
import { adminPaneStoryDecorator } from "@/admin-core/stories/admin-pane-stories.decorator";
import {
  type AdminStoryDataOverride,
  useAdminPaneStoryController,
} from "@/admin-core/stories/admin-pane-stories.harness";

function MeetPaneHarness({ dataOverride }: { dataOverride?: AdminStoryDataOverride }) {
  const controller = useAdminPaneStoryController(dataOverride);
  return <AdminMeetPane controller={controller} />;
}

const meta = {
  title: "Apps/Admin/Panes/Meet",
  component: AdminMeetPane,
  decorators: [adminPaneStoryDecorator],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AdminMeetPane>;

export default meta;
type Story = StoryObj<typeof AdminMeetPane>;

export const Default: Story = {
  render: () => <MeetPaneHarness />,
};

export const ForceRelayEnabled: Story = {
  render: () => <MeetPaneHarness dataOverride={{ voice: { forceRelay: true } }} />,
};
