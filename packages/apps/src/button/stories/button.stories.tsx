import type { Meta, StoryObj } from "@storybook/react-vite";
import { PenSquare } from "lucide-react";
import { BUTTON_SIZE_OPTIONS, BUTTON_VARIANT_OPTIONS, Button } from "../src/button";

const meta: Meta<typeof Button> = {
  title: "Shared/Buttons/Button",
  component: Button,
  argTypes: {
    size: {
      control: "select",
      options: BUTTON_SIZE_OPTIONS,
    },
    variant: {
      control: "select",
      options: BUTTON_VARIANT_OPTIONS,
    },
    pill: {
      control: "boolean",
    },
  },
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    label: "Compose",
    icon: <PenSquare />,
    variant: "primary",
    onClick: () => {},
  },
};

export const PrimaryPill: Story = {
  args: { ...Primary.args, size: "lg", pill: true },
};

export const Subtle: Story = {
  args: { ...Primary.args, variant: "subtle" },
};

export const Ghost: Story = {
  args: { ...Primary.args, variant: "ghost" },
};

export const Outline: Story = {
  args: { ...Primary.args, variant: "outline" },
};

export const Destructive: Story = {
  args: { ...Primary.args, variant: "destructive" },
};

export const Disabled: Story = {
  args: { ...Primary.args, disabled: true },
};
