import { useMemo } from "react";
import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  type RouterHistory,
} from "@tanstack/react-router";
import { createAdminAppBootstrap } from "@/lib/api/mock/admin-bootstrap";
import { createDriveAppBootstrap } from "@/lib/api/mock/drive-bootstrap";
import { createInstallAppBootstrap } from "@/lib/api/mock/install-bootstrap";
import { createMailAppBootstrap } from "@/lib/api/mock/mail-bootstrap";
import { createMeetAppBootstrap } from "@/lib/api/mock/meet-bootstrap";
import { createNotesAppBootstrap } from "@/lib/api/mock/notes-bootstrap";
import { createSettingsAppBootstrap } from "@/lib/api/mock/settings-bootstrap";
import { folderTokenFromMailboxLabel } from "@/lib/api/wgw/mail";
import { AdminWorkspace } from "@/admin-core/src/admin-workspace";
import { DriveWorkspace } from "@/drive-core/src/drive-workspace";
import { InstallWorkspace } from "@/install-core/src/install-workspace";
import { LoginScreen } from "@/login-core/src/login-screen";
import { MailWorkspace } from "@/mail-core/src/mail-workspace";
import { mailStoryLabels } from "@/mail-core/src/mail-app.stories.fixtures";
import { MeetWorkspace } from "@/meet-core/src/meet-workspace";
import { NotesWorkspace } from "@/notes-core/src/notes-workspace";
import { SettingsWorkspace } from "@/settings-core/src/settings-workspace";
import { WeGotWorkspaceHome } from "@/wegotworkspace/src/wegotworkspace-home";
import { WeGotWorkspaceLogout } from "@/wegotworkspace/src/wegotworkspace-logout";
import { useWeGotWorkspaceLogout } from "@/wegotworkspace/src/wegotworkspace-story-logout";

const STORY_SYSTEM_MAILBOXES = [
  "Inbox",
  "Starred",
  "Sent",
  "Drafts",
  "Spam",
  "Archive",
  "Trash",
] as const;

function StoryMailRoute() {
  const onLogout = useWeGotWorkspaceLogout();
  const bootstrap = useMemo(() => createMailAppBootstrap(), []);
  return (
    <MailWorkspace
      messages={bootstrap.data.mail}
      mailboxes={bootstrap.data.mailboxes}
      session={bootstrap.session}
      labels={mailStoryLabels}
      listLoading={false}
      systemMailboxes={STORY_SYSTEM_MAILBOXES}
      encodeFolderToken={folderTokenFromMailboxLabel}
      onLogout={onLogout}
    />
  );
}

function StoryNotesRoute() {
  const onLogout = useWeGotWorkspaceLogout();
  const bootstrap = useMemo(() => createNotesAppBootstrap(), []);
  return (
    <NotesWorkspace
      data={bootstrap.data}
      session={bootstrap.session}
      listLoading={false}
      onLogout={onLogout}
    />
  );
}

function StoryDriveRoute() {
  const onLogout = useWeGotWorkspaceLogout();
  const bootstrap = useMemo(() => createDriveAppBootstrap(), []);
  return (
    <DriveWorkspace
      data={bootstrap.data}
      session={bootstrap.session}
      listLoading={false}
      onLogout={onLogout}
    />
  );
}

function StorySettingsRoute() {
  const onLogout = useWeGotWorkspaceLogout();
  const bootstrap = useMemo(() => createSettingsAppBootstrap(), []);
  return <SettingsWorkspace {...bootstrap} onLogout={onLogout} />;
}

function StoryMeetRoute() {
  const onLogout = useWeGotWorkspaceLogout();
  const bootstrap = useMemo(() => createMeetAppBootstrap(), []);
  return (
    <MeetWorkspace
      data={bootstrap.data}
      session={bootstrap.session}
      listLoading={false}
      onLogout={onLogout}
    />
  );
}

function StoryAdminRoute() {
  const onLogout = useWeGotWorkspaceLogout();
  const bootstrap = useMemo(() => createAdminAppBootstrap(), []);
  return <AdminWorkspace {...bootstrap} onLogout={onLogout} />;
}

function StoryInstallRoute() {
  const bootstrap = useMemo(() => createInstallAppBootstrap(), []);
  return <InstallWorkspace {...bootstrap} />;
}

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: WeGotWorkspaceHome,
});

const loginRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/login",
  component: LoginScreen,
});

const logoutRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/logout",
  component: WeGotWorkspaceLogout,
});

const mailRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/mail",
  component: StoryMailRoute,
});

const notesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notes",
  component: StoryNotesRoute,
});

const driveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/drive",
  component: StoryDriveRoute,
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: StorySettingsRoute,
});

const meetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/meet",
  component: StoryMeetRoute,
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: StoryAdminRoute,
});

const installRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/install",
  component: StoryInstallRoute,
});

const storyRouteTree = rootRoute.addChildren([
  indexRoute,
  loginRoute,
  logoutRoute,
  mailRoute,
  notesRoute,
  driveRoute,
  settingsRoute,
  meetRoute,
  adminRoute,
  installRoute,
]);

export function createWeGotWorkspaceStoryRouter(history: RouterHistory) {
  return createRouter({
    routeTree: storyRouteTree,
    history,
    defaultPreloadStaleTime: 0,
  });
}
