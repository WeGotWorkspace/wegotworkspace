import {
  createRootRoute,
  createRoute,
  createRouter,
  Outlet,
  type RouterHistory,
} from "@tanstack/react-router";
import { AdminApp } from "@/admin-core/src/admin-app";
import { DriveApp } from "@/drive-core/src/drive-app";
import { InstallApp } from "@/install-core/src/install-app";
import { LoginScreen } from "@/login-core/src/login-screen";
import { MailApp } from "@/mail-core/src/mail-app";
import { MeetApp } from "@/meet-core/src/meet-app";
import { NotesApp } from "@/notes-core/src/notes-app";
import { SettingsApp } from "@/settings-core/src/settings-app";
import { WeGotWorkspaceLiveHome } from "@/wegotworkspace/src/wegotworkspace-live-home";
import { WeGotWorkspaceLogout } from "@/wegotworkspace/src/wegotworkspace-logout";
import { withWeGotWorkspaceAuth } from "@/wegotworkspace/src/wegotworkspace-require-auth";

const rootRoute = createRootRoute({
  component: () => <Outlet />,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  component: withWeGotWorkspaceAuth(WeGotWorkspaceLiveHome),
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
  component: withWeGotWorkspaceAuth(MailApp),
});

const notesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/notes",
  component: withWeGotWorkspaceAuth(NotesApp),
});

const driveRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/drive",
  component: withWeGotWorkspaceAuth(DriveApp),
});

const settingsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/settings",
  component: withWeGotWorkspaceAuth(SettingsApp),
});

const meetRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/meet",
  component: withWeGotWorkspaceAuth(MeetApp),
});

const adminRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/admin",
  component: withWeGotWorkspaceAuth(AdminApp),
});

const installRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/install",
  component: InstallApp,
});

const liveRouteTree = rootRoute.addChildren([
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

export function createWeGotWorkspaceLiveRouter(history: RouterHistory) {
  return createRouter({
    routeTree: liveRouteTree,
    history,
    defaultPreloadStaleTime: 0,
  });
}
