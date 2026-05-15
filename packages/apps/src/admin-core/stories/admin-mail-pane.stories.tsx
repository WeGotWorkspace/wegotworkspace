import type { Meta, StoryObj } from "@storybook/react-vite";
import { AdminMailPane } from "@/admin-core/src/admin-mail-pane";
import { adminPaneStoryDecorator } from "@/admin-core/stories/admin-pane-stories.decorator";
import { useAdminPaneStoryController } from "@/admin-core/stories/admin-pane-stories.harness";

function MailPaneHarness() {
  const controller = useAdminPaneStoryController();
  return <AdminMailPane controller={controller} />;
}

const meta = {
  title: "Apps/Admin/Panes/Mail",
  component: AdminMailPane,
  decorators: [adminPaneStoryDecorator],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AdminMailPane>;

export default meta;
type Story = StoryObj<typeof AdminMailPane>;

export const Default: Story = {
  render: () => <MailPaneHarness />,
};
