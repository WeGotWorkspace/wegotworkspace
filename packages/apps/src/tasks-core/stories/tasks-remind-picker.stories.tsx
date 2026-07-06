import type { Meta, StoryObj } from "@storybook/react-vite";
import { createTasksAppBootstrap } from "@/lib/api/mock/tasks-bootstrap";
import { TasksRemindPicker } from "@/tasks-core/src/tasks-remind-picker";
import { defaultTasksLabels } from "@/tasks-core/src/tasks-labels";
import { TasksStoryScope } from "@/tasks-core/stories/tasks-story-scope";

const meta: Meta<typeof TasksRemindPicker> = {
  title: "Apps/Tasks/Panes/RemindMe",
  component: TasksRemindPicker,
  decorators: [
    (Story) => (
      <TasksStoryScope variant="detail">
        <Story />
      </TasksStoryScope>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TasksRemindPicker>;

export const WithReminder: Story = {
  args: {
    labels: defaultTasksLabels,
    alerts: createTasksAppBootstrap().data.tasks[1]?.alerts,
    due: createTasksAppBootstrap().data.tasks[1]?.due,
    onChange: () => undefined,
  },
};
