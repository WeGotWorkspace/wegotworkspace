import { useMemo } from "react";
import {
  createRoute,
  createRouter,
  redirect,
  type AnyRouter,
  type RouterHistory,
} from "@tanstack/react-router";
import { AdminApp } from "@/admin-core/src/admin-app";
import { ContactsApp } from "@/contacts-core/src/contacts-app";
import { DocsApp } from "@/docs-core/src/docs-app";
import { validateDocsRouteSearch } from "@/docs-core/src/docs-route-search";
import { DriveApp } from "@/drive-core/src/drive-app";
import { validateDriveRouteSearch } from "@/drive-core/src/drive-route-search";
import { validateMeetRouteSearch } from "@/meet-core/src/meet-route-search";
import { InstallApp } from "@/install-core/src/install-app";
import { MailApp } from "@/mail-core/src/mail-app";
import { MeetApp } from "@/meet-core/src/meet-app";
import { createWgwMeetGuestApiSource } from "@/meet-core/src/meet-api-source";
import { NotesApp } from "@/notes-core/src/notes-app";
import { SettingsApp } from "@/settings-core/src/settings-app";
import { createAdminAppBootstrap } from "@/lib/api/mock/admin-bootstrap";
import { createContactsAppBootstrap } from "@/lib/api/mock/contacts-bootstrap";
import { createDriveAppBootstrap } from "@/lib/api/mock/drive-bootstrap";
import { createInstallWorkspaceStoryArgs } from "@/lib/api/mock/install-bootstrap";
import { createMailAppBootstrap } from "@/lib/api/mock/mail-bootstrap";
import { createMeetAppBootstrap } from "@/lib/api/mock/meet-bootstrap";
import { createDocsAppBootstrap } from "@/lib/api/mock/docs-bootstrap";
import { createNotesAppBootstrap } from "@/lib/api/mock/notes-bootstrap";
import { createSettingsAppBootstrap } from "@/lib/api/mock/settings-bootstrap";
import { folderTokenFromMailboxLabel } from "@/lib/mail/folder-token";
import { AdminWorkspace } from "@/admin-core/src/admin-workspace";
import { ContactsWorkspace } from "@/contacts-core/src/contacts-workspace";
import { DriveWorkspace } from "@/drive-core/src/drive-workspace";
import { InstallWorkspace } from "@/install-core/src/install-workspace";
import { MailWorkspace } from "@/mail-core/src/mail-workspace";
import { mailStoryLabels } from "@/mail-core/src/mail-app.stories.fixtures";
import { MeetWorkspace } from "@/meet-core/src/meet-workspace";
import { DocsWorkspace } from "@/docs-core/src/docs-workspace";
import { NotesWorkspace } from "@/notes-core/src/notes-workspace";
import { SettingsWorkspace } from "@/settings-core/src/settings-workspace";
import { WeGotWorkspaceHome } from "@/wegotworkspace/src/wegotworkspace-home";
import { WeGotWorkspaceLiveHome } from "@/wegotworkspace/src/wegotworkspace-live-home";
import {
  loginRouteBeforeLoad,
  WeGotWorkspaceLoginRoute,
  type LoginSearch,
} from "@/wegotworkspace/src/wegotworkspace-login-route";
import { WeGotWorkspaceLogout } from "@/wegotworkspace/src/wegotworkspace-logout";
import { withWeGotWorkspaceAuth } from "@/wegotworkspace/src/wegotworkspace-require-auth";
import { wegotworkspaceRootRoute } from "@/wegotworkspace/src/wegotworkspace-router-shared";
import { WeGotWorkspaceNotFound } from "@/wegotworkspace/src/wegotworkspace-shell";
import { useWeGotWorkspaceLogout } from "@/wegotworkspace/src/wegotworkspace-story-logout";

export type WeGotWorkspaceRouteMode = "mock" | "live";

const STORY_SYSTEM_MAILBOXES = [
  "Inbox",
  "Starred",
  "Sent",
  "Drafts",
  "Spam",
  "Archive",
  "Trash",
] as const;

const guestMeetSource = createWgwMeetGuestApiSource();

function MockMailRoute() {
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

function MockDocsRoute() {
  const onLogout = useWeGotWorkspaceLogout();
  const bootstrap = useMemo(() => createDocsAppBootstrap(), []);
  return <DocsWorkspace data={bootstrap.data} session={bootstrap.session} onLogout={onLogout} />;
}

function MockNotesRoute() {
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

function MockDriveRoute() {
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

function MockSettingsRoute() {
  const onLogout = useWeGotWorkspaceLogout();
  const bootstrap = useMemo(() => createSettingsAppBootstrap(), []);
  return <SettingsWorkspace {...bootstrap} onLogout={onLogout} />;
}

function MockMeetRoute() {
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

function MockContactsRoute() {
  const onLogout = useWeGotWorkspaceLogout();
  const bootstrap = useMemo(() => createContactsAppBootstrap(), []);
  return (
    <ContactsWorkspace
      data={bootstrap.data}
      session={bootstrap.session}
      listLoading={false}
      onLogout={onLogout}
    />
  );
}

function MockAdminRoute() {
  const onLogout = useWeGotWorkspaceLogout();
  const bootstrap = useMemo(() => createAdminAppBootstrap(), []);
  return <AdminWorkspace {...bootstrap} onLogout={onLogout} />;
}

function MockInstallRoute() {
  const bootstrap = useMemo(() => createInstallWorkspaceStoryArgs(), []);
  return <InstallWorkspace {...bootstrap} />;
}

function MeetGuestRoute() {
  return <MeetApp source={guestMeetSource} />;
}

function buildRouteTree(mode: WeGotWorkspaceRouteMode) {
  const isLive = mode === "live";
  const Home = isLive ? WeGotWorkspaceLiveHome : WeGotWorkspaceHome;

  const indexRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/",
    component: isLive ? withWeGotWorkspaceAuth(Home) : Home,
  });

  const loginRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/login",
    validateSearch: (search: Record<string, unknown>): LoginSearch => ({
      return: typeof search.return === "string" ? search.return : undefined,
    }),
    beforeLoad: loginRouteBeforeLoad,
    component: WeGotWorkspaceLoginRoute,
  });

  const logoutRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/logout",
    component: WeGotWorkspaceLogout,
  });

  const mailRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/mail",
    component: isLive ? withWeGotWorkspaceAuth(MailApp) : MockMailRoute,
  });

  const NotesComponent = isLive ? withWeGotWorkspaceAuth(NotesApp) : MockNotesRoute;

  // Each notes path is a root-level route with its own component so `useParams` in
  // NotesApp resolves leaf params (noteId, notebookSlug, tagSlug) on direct page loads.
  const notesIndexRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/notes",
    beforeLoad: () => {
      throw redirect({ to: "/notes/all" });
    },
  });

  const notesAllRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/notes/all",
    component: NotesComponent,
  });

  const notesAllNoteRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/notes/all/$noteId",
    component: NotesComponent,
  });

  const notesStarredRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/notes/starred",
    component: NotesComponent,
  });

  const notesStarredNoteRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/notes/starred/$noteId",
    component: NotesComponent,
  });

  const notesArchiveRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/notes/archive",
    component: NotesComponent,
  });

  const notesArchiveNoteRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/notes/archive/$noteId",
    component: NotesComponent,
  });

  const notesTagRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/notes/tags/$tagSlug",
    component: NotesComponent,
  });

  const notesTagNoteRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/notes/tags/$tagSlug/$noteId",
    component: NotesComponent,
  });

  const notesNotebookRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/notes/$notebookSlug",
    component: NotesComponent,
  });

  const notesNotebookNoteRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/notes/$notebookSlug/$noteId",
    component: NotesComponent,
  });

  const driveRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/drive",
    validateSearch: validateDriveRouteSearch,
    component: isLive ? withWeGotWorkspaceAuth(DriveApp) : MockDriveRoute,
  });

  const docsRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/docs",
    validateSearch: validateDocsRouteSearch,
    component: isLive ? withWeGotWorkspaceAuth(DocsApp) : MockDocsRoute,
  });

  const settingsRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/settings",
    component: isLive ? withWeGotWorkspaceAuth(SettingsApp) : MockSettingsRoute,
  });

  const meetRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/meet",
    validateSearch: validateMeetRouteSearch,
    component: isLive ? withWeGotWorkspaceAuth(MeetApp) : MockMeetRoute,
  });

  const meetGuestRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/meet/guest",
    validateSearch: validateMeetRouteSearch,
    component: MeetGuestRoute,
  });

  const meetJoinRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/meet/join",
    validateSearch: validateMeetRouteSearch,
    component: MeetGuestRoute,
  });

  const adminRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/admin",
    component: isLive ? withWeGotWorkspaceAuth(AdminApp) : MockAdminRoute,
  });

  const ContactsComponent = isLive ? withWeGotWorkspaceAuth(ContactsApp) : MockContactsRoute;

  // Each contacts path is a root-level route with its own component so `useParams` in
  // ContactsApp resolves leaf params (contactId, groupCardId) on direct page loads.
  const contactsIndexRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/contacts",
    beforeLoad: () => {
      throw redirect({ to: "/contacts/all" });
    },
  });

  const contactsAllRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/contacts/all",
    component: ContactsComponent,
  });

  const contactsAllContactRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/contacts/all/$contactId",
    component: ContactsComponent,
  });

  const contactsGroupRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/contacts/groups/$groupCardId",
    component: ContactsComponent,
  });

  const contactsGroupContactRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/contacts/groups/$groupCardId/$contactId",
    component: ContactsComponent,
  });

  const installRoute = createRoute({
    getParentRoute: () => wegotworkspaceRootRoute,
    path: "/install",
    component: isLive ? InstallApp : MockInstallRoute,
  });

  return wegotworkspaceRootRoute.addChildren([
    indexRoute,
    loginRoute,
    logoutRoute,
    mailRoute,
    notesIndexRoute,
    notesAllRoute,
    notesAllNoteRoute,
    notesStarredRoute,
    notesStarredNoteRoute,
    notesArchiveRoute,
    notesArchiveNoteRoute,
    notesTagRoute,
    notesTagNoteRoute,
    notesNotebookRoute,
    notesNotebookNoteRoute,
    driveRoute,
    docsRoute,
    settingsRoute,
    meetRoute,
    meetGuestRoute,
    meetJoinRoute,
    adminRoute,
    contactsIndexRoute,
    contactsAllRoute,
    contactsAllContactRoute,
    contactsGroupRoute,
    contactsGroupContactRoute,
    installRoute,
  ]);
}

export function createWeGotWorkspaceRouter({
  mode,
  history,
}: {
  mode: WeGotWorkspaceRouteMode;
  history: RouterHistory;
}): AnyRouter {
  return createRouter({
    routeTree: buildRouteTree(mode),
    history,
    defaultPreloadStaleTime: 0,
    defaultNotFoundComponent: WeGotWorkspaceNotFound,
  });
}
