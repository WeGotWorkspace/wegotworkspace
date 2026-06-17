import type { Meta, StoryObj } from "@storybook/react-vite";
import { defaultOfflineLabels } from "@/lib/offline/offline-labels";
import { OfflineStatusIndicator } from "@/lib/offline/offline-status-indicator";

const meta = {
  title: "Shared/Offline Status Indicator",
  component: OfflineStatusIndicator,
  tags: ["vitest-ci"],
  parameters: { layout: "fullscreen" },
  argTypes: {
    message: { control: "text" },
    className: { control: false },
    online: { control: "boolean" },
  },
} satisfies Meta<typeof OfflineStatusIndicator>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Offline: Story = {
  args: {
    online: false,
    message: defaultOfflineLabels.statusMessage,
  },
};

export const CustomMessage: Story = {
  args: {
    online: false,
    message: "Offline — edits queue until you're back online",
  },
};
