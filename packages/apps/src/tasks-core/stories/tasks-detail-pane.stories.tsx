import type { Meta, StoryObj } from "@storybook/react-vite";
import { createTasksAppBootstrap } from "@/lib/api/mock/tasks-bootstrap";
import { TasksDetailView } from "@/tasks-core/src/tasks-detail-view";
import { defaultTasksLabels } from "@/tasks-core/src/tasks-labels";
import { TasksStoryScope } from "@/tasks-core/stories/tasks-story-scope";

const bootstrap = createTasksAppBootstrap();
const task = bootstrap.data.tasks[1]!;

const meta: Meta<typeof TasksDetailView> = {
  title: "Apps/Tasks/Panes/Detail",
  component: TasksDetailView,
  decorators: [
    (Story) => (
      <TasksStoryScope variant="detail">
        <Story />
      </TasksStoryScope>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TasksDetailView>;

export const DetailPane: Story = {
  args: {
    task,
    labels: defaultTasksLabels,
    onUpdate: () => undefined,
    onDelete: () => undefined,
    onToggleTag: () => undefined,
    onSetAlerts: () => undefined,
  },
};
