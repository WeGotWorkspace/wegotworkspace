import type { Meta, StoryObj } from "@storybook/react-vite";
import { AdminUsersPane } from "@/admin-core/src/admin-users-pane";
import {
  buildGroupMemberCountFromController,
  useAdminPaneStoryController,
} from "@/admin-core/stories/admin-pane-stories.harness";
import { AdminStoryScope } from "@/admin-core/stories/admin-story-scope";

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
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AdminUsersPane>;

export default meta;
type Story = StoryObj<typeof AdminUsersPane>;

export const Default: Story = {
  render: () => <UsersPaneHarness />,
};
