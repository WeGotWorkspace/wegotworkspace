import type { Meta, StoryObj } from "@storybook/react-vite";
import { AppSwitchButton } from "../src/app-switch-button";

const meta: Meta<typeof AppSwitchButton> = {
  title: "Shared/App Switch Button",
  component: AppSwitchButton,
  parameters: {
    layout: "centered",
    /** Docs / `@ljcl/storybook-addon-cssprops`: tweak tokens used by menu surface classes. */
    cssprops: {
      "color-paper": { value: "var(--color-paper)", description: "Notes / workspace menu surface" },
      "color-ink": { value: "var(--color-ink)", description: "Primary ink on light surfaces" },
    },
  },
};

export default meta;
type Story = StoryObj<typeof AppSwitchButton>;

export const Default: Story = {
  args: {
    subtitle: "Workspace",
  },
};

export const Compact: Story = {
  args: {
    variant: "compact",
    subtitle: "Docs",
  },
};

export const Disabled: Story = {
  args: {
    ...Default.args,
    disabled: true,
  },
};
