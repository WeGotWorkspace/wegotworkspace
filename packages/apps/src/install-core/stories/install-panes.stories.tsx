import { useEffect } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { InstallAdminPane } from "@/install-core/src/install-admin-pane";
import { InstallDatabasePane } from "@/install-core/src/install-database-pane";
import { InstallDavPane } from "@/install-core/src/install-dav-pane";
import { InstallDonePane } from "@/install-core/src/install-done-pane";
import { InstallMailPane } from "@/install-core/src/install-mail-pane";
import { InstallMeetPane } from "@/install-core/src/install-meet-pane";
import { InstallServerPane } from "@/install-core/src/install-server-pane";
import { InstallWelcomePane } from "@/install-core/src/install-welcome-pane";
import type { InstallControllerState } from "@/install-core/src/use-install-controller";
import { InstallControllerHarness } from "./install-panes.stories.fixtures";
import { InstallStoryScope } from "./install-story-scope";

const meta = {
  title: "Apps/Install/Panes",
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta;

export default meta;
type Story = StoryObj;

function ControllerPane({
  initialStep,
  onReady,
  renderPane,
}: {
  initialStep?: Parameters<typeof InstallControllerHarness>[0]["initialStep"];
  onReady?: (controller: InstallControllerState) => void;
  renderPane: (controller: InstallControllerState) => React.ReactNode;
}) {
  return (
    <InstallControllerHarness initialStep={initialStep} onReady={onReady}>
      {(controller) => renderPane(controller)}
    </InstallControllerHarness>
  );
}

export const Welcome: Story = {
  name: "InstallWelcomePane",
  render: () => (
    <InstallStoryScope>
      <InstallWelcomePane />
    </InstallStoryScope>
  ),
};

export const Server: Story = {
  name: "InstallServerPane",
  render: () => (
    <ControllerPane
      initialStep="server"
      renderPane={(controller) => <InstallServerPane controller={controller} />}
    />
  ),
};

export const ServerChecksVisible: Story = {
  name: "InstallServerPane (checks expanded)",
  render: () => (
    <ControllerPane
      initialStep="server"
      onReady={(controller) => controller.setShowChecks(true)}
      renderPane={(controller) => <InstallServerPane controller={controller} />}
    />
  ),
};

export const DatabaseSqlite: Story = {
  name: "InstallDatabasePane (SQLite)",
  render: () => (
    <ControllerPane
      initialStep="database"
      renderPane={(controller) => <InstallDatabasePane controller={controller} />}
    />
  ),
};

function MysqlDatabaseHarness() {
  return (
    <ControllerPane
      initialStep="database"
      onReady={(controller) => controller.selectDbType("mysql")}
      renderPane={(controller) => <InstallDatabasePane controller={controller} />}
    />
  );
}

export const DatabaseMysql: Story = {
  name: "InstallDatabasePane (MySQL)",
  render: () => <MysqlDatabaseHarness />,
};

export const Dav: Story = {
  name: "InstallDavPane",
  render: () => (
    <ControllerPane
      initialStep="dav"
      renderPane={(controller) => <InstallDavPane controller={controller} />}
    />
  ),
};

function MailEnabledHarness() {
  return (
    <ControllerPane
      initialStep="mail"
      onReady={(controller) => controller.setMail((current) => ({ ...current, enabled: true }))}
      renderPane={(controller) => <InstallMailPane controller={controller} />}
    />
  );
}

export const MailDisabled: Story = {
  name: "InstallMailPane",
  render: () => (
    <ControllerPane
      initialStep="mail"
      renderPane={(controller) => <InstallMailPane controller={controller} />}
    />
  ),
};

export const MailEnabled: Story = {
  name: "InstallMailPane (webmail enabled)",
  render: () => <MailEnabledHarness />,
};

function MeetEnabledHarness() {
  return (
    <ControllerPane
      initialStep="meet"
      onReady={(controller) => controller.setMeet((current) => ({ ...current, enabled: true }))}
      renderPane={(controller) => <InstallMeetPane controller={controller} />}
    />
  );
}

export const MeetDisabled: Story = {
  name: "InstallMeetPane",
  render: () => (
    <ControllerPane
      initialStep="meet"
      renderPane={(controller) => <InstallMeetPane controller={controller} />}
    />
  ),
};

export const MeetEnabled: Story = {
  name: "InstallMeetPane (RTC enabled)",
  render: () => <MeetEnabledHarness />,
};

export const Admin: Story = {
  name: "InstallAdminPane",
  render: () => (
    <ControllerPane
      initialStep="admin"
      renderPane={(controller) => <InstallAdminPane controller={controller} />}
    />
  ),
};

export const Done: Story = {
  name: "InstallDonePane",
  render: () => (
    <InstallStoryScope>
      <InstallDonePane onOpenAdmin={() => {}} />
    </InstallStoryScope>
  ),
};

export const AdminFilled: Story = {
  name: "InstallAdminPane (filled)",
  render: () => (
    <ControllerPane
      initialStep="admin"
      onReady={(controller) =>
        controller.setAdmin({
          username: "admin",
          displayName: "Jane Doe",
          email: "admin@example.com",
          password: "hunter2hunter",
          password2: "hunter2hunter",
        })
      }
      renderPane={(controller) => <InstallAdminPane controller={controller} />}
    />
  ),
};
