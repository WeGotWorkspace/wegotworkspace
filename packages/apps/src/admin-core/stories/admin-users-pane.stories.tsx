import type { Meta, StoryObj } from "@storybook/react-vite";
import { AdminUsersPane } from "@/admin-core/src/admin-users-pane";
import { adminPaneStoryDecorator } from "@/admin-core/stories/admin-pane-stories.decorator";
import {
  buildGroupMemberCountFromController,
  useAdminPaneStoryController,
} from "@/admin-core/stories/admin-pane-stories.harness";

const noop = () => {};

function UsersPaneHarness() {
  const controller = useAdminPaneStoryController();
  const groupMemberCount = buildGroupMemberCountFromController(controller);
  return (
    <AdminUsersPane
      controller={controller}
      groupMemberCount={groupMemberCount}
      onNewUser={noop}
      onEditUser={noop}
      onPasswordUser={noop}
      onDeleteUser={noop}
      onNewGroup={noop}
      onEditGroup={noop}
      onDeleteGroup={noop}
    />
  );
}

const meta = {
  title: "Apps/Admin/Panes/Users",
  component: AdminUsersPane,
  decorators: [adminPaneStoryDecorator],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AdminUsersPane>;

export default meta;
type Story = StoryObj<typeof AdminUsersPane>;

export const Default: Story = {
  render: () => <UsersPaneHarness />,
};
