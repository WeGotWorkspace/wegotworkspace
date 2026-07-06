import type { Meta, StoryObj } from "@storybook/react-vite";
import { createTasksAppBootstrap } from "@/lib/api/mock/tasks-bootstrap";
import { TasksWorkspace } from "@/tasks-core/src/tasks-workspace";
import { TasksStoryScope } from "@/tasks-core/stories/tasks-story-scope";

const meta: Meta<typeof TasksWorkspace> = {
  title: "Apps/Tasks/Panes/List",
  component: TasksWorkspace,
  decorators: [
    (Story) => (
      <TasksStoryScope variant="list-column">
        <Story />
      </TasksStoryScope>
    ),
  ],
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof TasksWorkspace>;

export const ListPane: Story = {
  args: {
    ...createTasksAppBootstrap(),
    initialView: "state:all",
  },
};
