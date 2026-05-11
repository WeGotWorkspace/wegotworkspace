import type { Meta, StoryObj } from "@storybook/react-vite";
import { PackageCheck } from "lucide-react";
import { Callout } from "../src/callout";

const meta: Meta<typeof Callout> = {
  title: "Shared/Callout",
  component: Callout,
  decorators: [
    (Story) => (
      <div
        className="max-w-xl p-6 rounded-xl border"
        style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Callout>;

export const Warning: Story = {
  args: {
    severity: "warning",
    title: "Update available",
    message: "v2.5.0 introduces faster sync and security patches.",
    subtitle: "Checked on 2026-05-08 13:00",
  },
};

export const SuccessCustomIcon: Story = {
  args: {
    severity: "success",
    icon: <PackageCheck className="size-4" style={{ color: "#3a8f5a" }} />,
    title: "You're up to date",
    message: "Running the latest stable release.",
    subtitle: "No action required",
  },
};

export const Error: Story = {
  args: {
    severity: "error",
    title: "Update failed",
    message: "Integrity check failed for downloaded package.",
    subtitle: "Try again or inspect server logs",
  },
};
