import type { Meta, StoryObj } from "@storybook/react-vite";
import { AdminWebdavPane } from "@/admin-core/src/admin-webdav-pane";
import { adminPaneStoryDecorator } from "@/admin-core/stories/admin-pane-stories.decorator";
import { useAdminPaneStoryController } from "@/admin-core/stories/admin-pane-stories.harness";

function WebdavPaneHarness() {
  const controller = useAdminPaneStoryController();
  return <AdminWebdavPane controller={controller} />;
}

const meta = {
  title: "Apps/Admin/Panes/WebDAV",
  component: AdminWebdavPane,
  decorators: [adminPaneStoryDecorator],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AdminWebdavPane>;

export default meta;
type Story = StoryObj<typeof AdminWebdavPane>;

export const Default: Story = {
  render: () => <WebdavPaneHarness />,
};
