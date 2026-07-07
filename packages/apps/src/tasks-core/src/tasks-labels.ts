export type TasksUILabels = {
  appName: string;
  sidebarStates: string;
  sidebarTags: string;
  sidebarInbox: string;
  sidebarProjects: string;
  stateAll: string;
  stateToday: string;
  stateUpcoming: string;
  stateOverdue: string;
  stateNeedsAction: string;
  newTask: string;
  listTasks: (count: number) => string;
  listSelected: (count: number) => string;
  searchPlaceholder: string;
  refreshList: string;
  emptyList: string;
  emptyDetail: string;
  selectTask: string;
  fallbackViewTitle: string;
  tagViewTitle: (tag: string) => string;
  statusNeedsAction: string;
  statusInProcess: string;
  statusCompleted: string;
  statusCancelled: string;
  priorityHigh: string;
  priorityNormal: string;
  priorityLow: string;
  dueLabel: string;
  noDue: string;
  descriptionLabel: string;
  tagsLabel: string;
  addTag: string;
  remindMe: string;
  remindNone: string;
  remindAtDue: string;
  remind30Min: string;
  remind1Hour: string;
  remind1Day: string;
  remindCustom: string;
  kanbanToggle: string;
  listView: string;
  addTaskName: string;
  addTaskNamePlaceholder: string;
  addTaskDescriptionPlaceholder: string;
  addTaskList: string;
  addTaskTag: string;
  addTaskTagPlaceholder: string;
  addTaskButton: string;
  editTask: string;
  editTaskPrompt: string;
  markComplete: string;
  markIncomplete: string;
  taskActions: string;
  delete: string;
  deleteConfirmTitle: string;
  deleteConfirmBody: string;
  cancel: string;
  toastSaved: string;
  toastDeleted: string;
  createTaskTitle: string;
  untitledTask: string;
  subtasksLabel: string;
  tasksDisabledTitle: string;
  tasksDisabledMessage: string;
};

export const defaultTasksLabels: TasksUILabels = {
  appName: "Tasks",
  sidebarStates: "States",
  sidebarTags: "Tags",
  sidebarInbox: "Inbox",
  sidebarProjects: "Projects",
  stateAll: "All",
  stateToday: "Today",
  stateUpcoming: "Upcoming",
  stateOverdue: "Overdue",
  stateNeedsAction: "Needs action",
  newTask: "New task",
  listTasks: (count) => (count === 1 ? "1 task" : `${count} tasks`),
  listSelected: (count) => (count === 1 ? "1 selected" : `${count} selected`),
  searchPlaceholder: "Search tasks",
  refreshList: "Refresh",
  emptyList: "No tasks in this view.",
  emptyDetail: "Select a task or create a new one.",
  selectTask: "Select a task",
  fallbackViewTitle: "Tasks",
  tagViewTitle: (tag) => tag,
  statusNeedsAction: "Needs action",
  statusInProcess: "In progress",
  statusCompleted: "Completed",
  statusCancelled: "Cancelled",
  priorityHigh: "High",
  priorityNormal: "Normal",
  priorityLow: "Low",
  dueLabel: "Due",
  noDue: "No due date",
  descriptionLabel: "Notes",
  tagsLabel: "Tags",
  addTag: "Add tag",
  remindMe: "Remind me",
  remindNone: "None",
  remindAtDue: "At time of task",
  remind30Min: "30 minutes before",
  remind1Hour: "1 hour before",
  remind1Day: "1 day before",
  remindCustom: "Custom date & time",
  kanbanToggle: "Kanban",
  listView: "List",
  addTaskName: "Task name",
  addTaskNamePlaceholder: "Task name",
  addTaskDescriptionPlaceholder: "Description",
  addTaskList: "List",
  addTaskTag: "Tag",
  addTaskTagPlaceholder: "tag",
  addTaskButton: "Add task",
  editTask: "Edit",
  editTaskPrompt: "Task title",
  markComplete: "Mark complete",
  markIncomplete: "Mark incomplete",
  taskActions: "Task actions",
  delete: "Delete",
  deleteConfirmTitle: "Delete task?",
  deleteConfirmBody: "This task will be removed from your list.",
  cancel: "Cancel",
  toastSaved: "Saved",
  toastDeleted: "Task deleted",
  createTaskTitle: "New task",
  untitledTask: "Untitled task",
  subtasksLabel: "Subtasks",
  tasksDisabledTitle: "Tasks unavailable",
  tasksDisabledMessage: "Tasks are disabled for this workspace.",
};

export function mergeTasksLabels(overrides?: Partial<TasksUILabels>): TasksUILabels {
  return { ...defaultTasksLabels, ...overrides };
}
