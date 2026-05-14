import type { Meta, StoryObj } from "@storybook/react-vite";
import { Star } from "lucide-react";
import { IconButton } from "../src/app-button";

const meta: Meta<typeof IconButton> = {
  title: "Shared/Buttons/IconButton",
  component: IconButton,
};

export default meta;
type Story = StoryObj<typeof IconButton>;

export const Default: StoryObj<typeof IconButton> = {
  args: {
    label: "Favorite",
    icon: <Star className="size-4" fill="currentColor" />,
    size: "md",
    variant: "subtle",
    onClick: () => {},
  },
  render: (args) => <IconButton {...args} />,
};

export const Active: StoryObj<typeof IconButton> = {
  ...Default,
  args: { ...Default.args, active: true },
};

export const Ghost: StoryObj<typeof IconButton> = {
  ...Default,
  args: { ...Default.args, variant: "ghost" },
};

export const Disabled: StoryObj<typeof IconButton> = {
  ...Default,
  args: { ...Default.args, disabled: true },
};
