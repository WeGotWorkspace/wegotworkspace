import type { Meta, StoryObj } from "@storybook/react-vite";
import { createTasksAppBootstrap } from "@/lib/api/mock/tasks-bootstrap";
import { TasksMainView } from "@/tasks-core/src/tasks-main-view";
import { defaultTasksLabels } from "@/tasks-core/src/tasks-labels";
import { TasksStoryScope } from "@/tasks-core/stories/tasks-story-scope";

const bootstrap = createTasksAppBootstrap();

const meta: Meta<typeof TasksMainView> = {
  title: "Apps/Tasks/Main view",
  component: TasksMainView,
  decorators: [
    (Story) => (
      <TasksStoryScope variant="main">
        <Story />
      </TasksStoryScope>
    ),
  ],
  parameters: { layout: "fullscreen" },
};

export default meta;
type Story = StoryObj<typeof TasksMainView>;

export const MainView: Story = {
  args: {
    L: defaultTasksLabels,
    listLoading: false,
    visibleTasks: bootstrap.data.tasks,
    taskLists: bootstrap.data.taskLists,
    defaultListId: "default",
    canCreate: true,
    onToggleComplete: () => undefined,
    onEditTask: () => undefined,
    onDeleteTask: () => undefined,
    onCreateTask: () => undefined,
    itemDragHandlers: () => ({}),
    isItemDragging: () => false,
  },
};
