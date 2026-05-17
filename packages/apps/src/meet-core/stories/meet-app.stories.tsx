import type { Meta, StoryObj } from "@storybook/react-vite";
import { createMeetAppBootstrap } from "@/lib/api/mock/meet-bootstrap";
import { MeetWorkspace } from "@/meet-core/src/meet-workspace";

const meta: Meta<typeof MeetWorkspace> = {
  title: "Apps/Meet",
  component: MeetWorkspace,
  parameters: {
    layout: "fullscreen",
  },
};

export default meta;
type Story = StoryObj<typeof MeetWorkspace>;

export const Default: Story = {
  args: {
    ...createMeetAppBootstrap(),
    onLogout: () => {},
  },
};
