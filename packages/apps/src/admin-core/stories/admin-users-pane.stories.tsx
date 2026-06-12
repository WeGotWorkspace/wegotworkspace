import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { AdminUsersPane } from "@/admin-core/src/admin-users-pane";
import {
  buildGroupMemberCountFromController,
  useAdminPaneStoryController,
} from "@/admin-core/stories/admin-pane-stories.harness";
import { AdminStoryScope } from "@/admin-core/stories/admin-story-scope";

function UsersPaneHarness() {
  const controller = useAdminPaneStoryController();
  const groupMemberCount = buildGroupMemberCountFromController(controller);
  const [lastAction, setLastAction] = useState<string | null>(null);

  return (
    <AdminStoryScope>
      <AdminUsersPane
        controller={controller}
        groupMemberCount={groupMemberCount}
        onNewUser={() => setLastAction("new-user")}
        onEditUser={(userId) => setLastAction(`edit-user:${userId}`)}
        onPasswordUser={() => setLastAction("password-user")}
        onDeleteUser={() => setLastAction("delete-user")}
        onNewGroup={() => setLastAction("new-group")}
        onEditGroup={(groupId) => setLastAction(`edit-group:${groupId}`)}
        onDeleteGroup={() => setLastAction("delete-group")}
      />
      {lastAction ? <p role="status">{`Action: ${lastAction}`}</p> : null}
    </AdminStoryScope>
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
  tags: ["vitest-ci"],
  render: () => <UsersPaneHarness />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Alice Example")).toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: "New group" }));
    await expect(canvas.getByRole("status")).toHaveTextContent("Action: new-group");
  },
};
