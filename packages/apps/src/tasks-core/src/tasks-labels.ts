export type TasksUILabels = {
  appName: string;
  sidebarTime: string;
  sidebarStatus: string;
  sidebarTags: string;
  sidebarInbox: string;
  sidebarProjects: string;
  stateAll: string;
  stateToday: string;
  stateUpcoming: string;
  stateOverdue: string;
  stateNeedsAction: string;
  stateInProcess: string;
  stateCompleted: string;
  stateCancelled: string;
  newTask: string;
  listTasks: (count: number) => string;
  listSelected: (count: number) => string;
  refreshList: string;
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
  showCompletedTasks: string;
  hideCompletedTasks: string;
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
  toastTaskCompleted: string;
  toastTaskReopened: string;
  toastTaskAdded: string;
  toastTaskUpdated: string;
  toastTaskMoved: (count: number, listName: string) => string;
  toastTaskTagged: (count: number, tag: string) => string;
  toastCompleteUndone: string;
  toastDeleteUndone: string;
  toastMoveUndone: string;
  toastTagUndone: string;
  toastListUpdated: string;
  toastListRefreshFailed: string;
  createTaskTitle: string;
  untitledTask: string;
  subtasksLabel: string;
  tasksDisabledTitle: string;
  tasksDisabledMessage: string;
};

export const defaultTasksLabels: TasksUILabels = {
  appName: "Tasks",
  sidebarTime: "Time",
  sidebarStatus: "Status",
  sidebarTags: "Tags",
  sidebarInbox: "Inbox",
  sidebarProjects: "Projects",
  stateAll: "All",
  stateToday: "Today",
  stateUpcoming: "Upcoming",
  stateOverdue: "Overdue",
  stateNeedsAction: "Needs action",
  stateInProcess: "In progress",
  stateCompleted: "Completed",
  stateCancelled: "Cancelled",
  newTask: "New task",
  listTasks: (count) => (count === 1 ? "1 task" : `${count} tasks`),
  listSelected: (count) => (count === 1 ? "1 selected" : `${count} selected`),
  refreshList: "Refresh",
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
  showCompletedTasks: "Show completed",
  hideCompletedTasks: "Hide completed",
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
  toastTaskCompleted: "Task completed",
  toastTaskReopened: "Marked incomplete",
  toastTaskAdded: "Task added",
  toastTaskUpdated: "Task updated",
  toastTaskMoved: (count, listName) =>
    count === 1 ? `Moved to ${listName}` : `Moved ${count} tasks to ${listName}`,
  toastTaskTagged: (count, tag) =>
    count === 1 ? `Tagged with ${tag}` : `Tagged ${count} tasks with ${tag}`,
  toastCompleteUndone: "Completion undone.",
  toastDeleteUndone: "Deletion undone.",
  toastMoveUndone: "Move undone.",
  toastTagUndone: "Tag assignment undone.",
  toastListUpdated: "List updated",
  toastListRefreshFailed: "Could not refresh tasks. Please try again.",
  createTaskTitle: "New task",
  untitledTask: "Untitled task",
  subtasksLabel: "Subtasks",
  tasksDisabledTitle: "Tasks unavailable",
  tasksDisabledMessage: "Tasks are disabled for this workspace.",
};

export function mergeTasksLabels(overrides?: Partial<TasksUILabels>): TasksUILabels {
  return { ...defaultTasksLabels, ...overrides };
}
