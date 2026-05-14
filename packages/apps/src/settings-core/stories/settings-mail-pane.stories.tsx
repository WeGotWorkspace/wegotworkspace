import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsMailPane } from "@/settings-core/src/settings-mail-pane";
import { createMockMail } from "./settings-panes.stories.fixtures";
import { settingsPaneDecorator } from "./settings-panes.stories.decorator";

const meta = {
  title: "Apps/Settings/Panes/Mail",
  component: SettingsMailPane,
  decorators: [settingsPaneDecorator],
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    mail: { control: false },
  },
} satisfies Meta<typeof SettingsMailPane>;

export default meta;
type Story = StoryObj<typeof SettingsMailPane>;

export const Default: Story = {
  args: {
    mail: createMockMail(),
  },
};

export const CredentialsDirty: Story = {
  args: {
    mail: createMockMail({
      imapUsername: "other@example.test",
      mailDirty: true,
    }),
  },
};

export const NoSavedImapPassword: Story = {
  args: {
    mail: createMockMail({
      imapHasPassword: false,
    }),
  },
};
