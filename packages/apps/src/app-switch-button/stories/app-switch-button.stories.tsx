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

/** In-app trigger: PNG icon + “we got” / route label (not workspace BrandMark). */
export const InApp: Story = {
  parameters: {
    routerPath: "/mail",
  },
};

/** Workspace home / install: BrandMark + “we got Workspace”. */
export const Workspace: Story = {
  args: {
    subtitle: "Workspace",
  },
};

export const CompactWorkspace: Story = {
  args: {
    variant: "compact",
    subtitle: "Workspace",
  },
};

/** Compact header in an app shell: PNG icon + single app name line. */
export const CompactInApp: Story = {
  parameters: {
    routerPath: "/docs",
  },
  args: {
    variant: "compact",
  },
};

export const Disabled: Story = {
  args: {
    ...Workspace.args,
    disabled: true,
  },
};
