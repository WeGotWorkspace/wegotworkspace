import type { Meta, StoryObj } from "@storybook/react-vite";
import { ViewModeToggle } from "@/view-mode-toggle/src/view-mode-toggle";

const meta = {
  title: "Shared/ViewModeToggle",
  component: ViewModeToggle,
  tags: ["autodocs"],
  argTypes: {
    value: { control: "radio", options: ["grid", "list"] },
  },
} satisfies Meta<typeof ViewModeToggle>;

export default meta;
type Story = StoryObj<typeof ViewModeToggle>;

export const Grid: Story = {
  args: {
    value: "grid",
    gridLabel: "Grid view",
    listLabel: "List view",
    onChange: () => {},
  },
};

export const List: Story = {
  args: {
    value: "list",
    gridLabel: "Grid view",
    listLabel: "List view",
    onChange: () => {},
  },
};
