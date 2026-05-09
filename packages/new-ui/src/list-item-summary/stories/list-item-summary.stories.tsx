import type { Meta, StoryObj } from "@storybook/react-vite";
import { CircleAlert, CircleCheck, RefreshCw } from "lucide-react";
import { ListItemSummary } from "../src/list-item-summary";

const meta: Meta<typeof ListItemSummary> = {
  title: "Shared/List Item Summary",
  component: ListItemSummary,
  decorators: [
    (Story) => (
      <div
        className="max-w-xl p-6 rounded-xl border"
        style={{ backgroundColor: "var(--color-cream, #f5f1e8)", color: "var(--color-ink)" }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof ListItemSummary>;

export const StatusRow: Story = {
  args: {
    icon: <CircleCheck className="size-4" style={{ color: "#3a8f5a" }} />,
    title: "Database connectivity",
    message: "Responding in 4 ms",
    subtitle: "Status: ok",
  },
};

export const WarningRow: Story = {
  args: {
    icon: <CircleAlert className="size-4" style={{ color: "#c98a1f" }} />,
    title: "Outbound network",
    message: "High latency to update mirror (820 ms)",
    subtitle: "Status: warn",
  },
};

export const ClickableRow: Story = {
  args: {
    icon: <RefreshCw className="size-4" />,
    title: "Re-run checks",
    message: "Trigger check pass for all services.",
    onClick: () => {},
    buttonLabel: "Re-run checks",
  },
};
