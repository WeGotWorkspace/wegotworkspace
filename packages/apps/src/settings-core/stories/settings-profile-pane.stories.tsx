import type { Meta, StoryObj } from "@storybook/react-vite";
import { SettingsProfilePane } from "@/settings-core/src/settings-profile-pane";
import { createMockProfile } from "./settings-panes.stories.fixtures";
import { settingsPaneDecorator } from "./settings-panes.stories.decorator";

const meta = {
  title: "Apps/Settings/Panes/Profile",
  component: SettingsProfilePane,
  decorators: [settingsPaneDecorator],
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    profile: { control: false },
  },
} satisfies Meta<typeof SettingsProfilePane>;

export default meta;
type Story = StoryObj<typeof SettingsProfilePane>;

export const Default: Story = {
  args: {
    profile: createMockProfile(),
  },
};

export const DirtyIdentity: Story = {
  args: {
    profile: createMockProfile({
      displayName: "Edited display name",
      profileDirty: true,
    }),
  },
};

export const PasswordFilled: Story = {
  args: {
    profile: createMockProfile({
      newPassword: "hunter2hunter",
      confirmPassword: "hunter2hunter",
    }),
  },
};
