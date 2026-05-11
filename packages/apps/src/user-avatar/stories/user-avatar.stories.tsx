import type { Meta, StoryObj } from "@storybook/react-vite";
import { UserAvatar } from "../src/user-avatar";

const meta: Meta<typeof UserAvatar> = {
  title: "Shared/User Avatar",
  component: UserAvatar,
};

export default meta;
type Story = StoryObj<typeof UserAvatar>;

export const Default: Story = {
  args: {
    displayName: "Elias Linden",
  },
};

export const Compact: Story = {
  args: {
    displayName: "Elias Linden",
    compact: true,
  },
};

export const CustomColors: Story = {
  args: {
    displayName: "Ada Pereira",
    backgroundColor: "rgba(255, 255, 255, 0.2)",
    color: "#ffffff",
  },
};

export const Clickable: Story = {
  args: {
    displayName: "Ada Pereira",
    onClick: () => {},
  },
};

export const WithSubtitle: Story = {
  args: {
    displayName: "Morgan Lee",
    subtitle: "morgan@example.com",
  },
};

/** Mail detail sender row: larger chip, emerald fill, two-line label. */
export const MailSenderRow: Story = {
  args: {
    displayName: "Ops Bot",
    subtitle: "ops@example.com · to you",
    size: "md",
    backgroundColor: "var(--color-emerald)",
    color: "var(--color-ink)",
  },
};

/** Sidebar-style: chip uses `avatarColor`, name uses shell `labelColor`. */
export const FooterTwoLine: Story = {
  args: {
    displayName: "Elias Linden",
    subtitle: "elias@example.com",
    backgroundColor: "color-mix(in oklab, var(--color-ink) 12%, transparent)",
    color: "var(--color-ink)",
    labelColor: "var(--color-ink)",
    subtitleColor: "color-mix(in oklab, var(--color-ink) 55%, transparent)",
  },
};
