import type { Meta, StoryObj } from "@storybook/react-vite";
import { PenSquare, Star } from "lucide-react";
import { Button, IconButton } from "../src/app-button";

const meta: Meta<typeof Button> = {
  title: "Shared/Buttons",
  component: Button,
};

export default meta;
type Story = StoryObj<typeof Button>;

export const Primary: Story = {
  args: {
    label: "Compose",
    icon: <PenSquare className="size-4" />,
    variant: "primary",
    onClick: () => {},
  },
};

export const PrimaryPill: Story = {
  args: { ...Primary.args, size: "pill" },
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

export const IconButtonDefault: StoryObj<typeof IconButton> = {
  args: {
    label: "Favorite",
    icon: <Star className="size-4" fill="currentColor" />,
    size: "md",
    variant: "subtle",
    onClick: () => {},
  },
  render: (args) => <IconButton {...args} />,
};

export const IconButtonActive: StoryObj<typeof IconButton> = {
  ...IconButtonDefault,
  args: { ...IconButtonDefault.args, active: true },
};

export const IconButtonGhost: StoryObj<typeof IconButton> = {
  ...IconButtonDefault,
  args: { ...IconButtonDefault.args, variant: "ghost" },
};

export const IconButtonDisabled: StoryObj<typeof IconButton> = {
  ...IconButtonDefault,
  args: { ...IconButtonDefault.args, disabled: true },
};
