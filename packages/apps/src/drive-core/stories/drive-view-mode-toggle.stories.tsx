import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { DriveViewModeToggle } from "@/drive-core/src/drive-view-mode-toggle";
import type { DriveViewMode } from "@/drive-core/src/drive-view-mode";

const meta = {
  title: "Apps/Drive/Components/DriveViewModeToggle",
  component: DriveViewModeToggle,
  parameters: {
    layout: "centered",
  },
} satisfies Meta<typeof DriveViewModeToggle>;

export default meta;
type Story = StoryObj<typeof DriveViewModeToggle>;

function ToggleHarness({ initial = "grid" }: { initial?: DriveViewMode }) {
  const [value, setValue] = useState<DriveViewMode>(initial);
  return (
    <DriveViewModeToggle
      value={value}
      onChange={setValue}
      gridLabel="Grid view"
      listLabel="List view"
      columnLabel="Column view"
    />
  );
}

export const Default: Story = {
  render: () => <ToggleHarness />,
};

export const ColumnSelected: Story = {
  name: "Column selected",
  render: () => <ToggleHarness initial="column" />,
};
