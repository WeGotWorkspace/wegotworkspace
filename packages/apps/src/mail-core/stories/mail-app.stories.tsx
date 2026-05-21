import type { Meta, StoryObj } from "@storybook/react-vite";
import { createMailAppBootstrap } from "@/lib/api/mock/mail-bootstrap";
import { MailWorkspace } from "@/mail-core/src/mail-workspace";
import { mailStoryLabels } from "@/mail-core/src/mail-app.stories.fixtures";
import { folderTokenFromMailboxLabel } from "@/lib/api/wgw/mail";

const STORY_SYSTEM_MAILBOXES = [
  "Inbox",
  "Starred",
  "Sent",
  "Drafts",
  "Spam",
  "Archive",
  "Trash",
] as const;

const bootstrap = createMailAppBootstrap();

const meta = {
  title: "Apps/Mail",
  component: MailWorkspace,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof MailWorkspace>;

export default meta;
type Story = StoryObj<typeof MailWorkspace>;

const workspaceArgs = {
  messages: bootstrap.data.mail,
  mailboxes: bootstrap.data.mailboxes,
  session: bootstrap.session,
  labels: mailStoryLabels,
  listLoading: false,
  systemMailboxes: STORY_SYSTEM_MAILBOXES,
  encodeFolderToken: folderTokenFromMailboxLabel,
  onLogout: () => {},
} as const;

export const Default: Story = {
  args: workspaceArgs,
};
