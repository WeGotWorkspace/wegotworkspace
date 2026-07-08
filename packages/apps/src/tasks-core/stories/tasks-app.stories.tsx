import type { Meta, StoryObj } from "@storybook/react-vite";
import { createTasksAppBootstrap } from "@/lib/api/mock/tasks-bootstrap";
import { TasksWorkspace } from "@/tasks-core/src/tasks-workspace";

const meta: Meta<typeof TasksWorkspace> = {
  title: "Apps/Tasks",
  component: TasksWorkspace,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof TasksWorkspace>;

export const Default: Story = {
  args: {
    ...createTasksAppBootstrap(),
  },
};
