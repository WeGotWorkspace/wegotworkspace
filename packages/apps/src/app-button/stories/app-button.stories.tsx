import type { Meta, StoryObj } from "@storybook/react-vite";
import { LogOut, PenSquare } from "lucide-react";
import { AppButton } from "../src/app-button";

const meta: Meta<typeof AppButton> = {
  title: "Shared/App Button",
  component: AppButton,
};

export default meta;
type Story = StoryObj<typeof AppButton>;

export const IconSubtle: Story = {
  args: {
    icon: <LogOut className="size-4" />,
    ariaLabel: "Log out",
    size: "icon",
    variant: "subtle",
    onClick: () => {},
  },
};

export const PillPrimary: Story = {
  args: {
    icon: <PenSquare className="size-4" />,
    label: "Compose",
    size: "pill",
    variant: "primary",
    onClick: () => {},
  },
};

export const MediumGhost: Story = {
  args: {
    label: "Edit",
    size: "md",
    variant: "ghost",
    onClick: () => {},
  },
};
