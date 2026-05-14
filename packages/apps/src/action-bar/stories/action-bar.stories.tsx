import type { Meta, StoryObj } from "@storybook/react-vite";
import { Archive, Forward, Reply, Star } from "lucide-react";
import { IconButton } from "@/button/src/button";
import { ActionBar } from "../src/action-bar";

const meta: Meta<typeof ActionBar> = {
  title: "Shared/Action Bar",
  component: ActionBar,
};

export default meta;
type Story = StoryObj<typeof ActionBar>;

export const MailLike: Story = {
  args: {
    onBack: () => {},
    left: (
      <>
        <IconButton label="Reply" onClick={() => {}} icon={<Reply />} variant="subtle" />
        <IconButton label="Forward" onClick={() => {}} icon={<Forward />} variant="subtle" />
      </>
    ),
    right: (
      <>
        <IconButton label="Star" onClick={() => {}} icon={<Star />} variant="subtle" />
        <IconButton label="Archive" onClick={() => {}} icon={<Archive />} variant="subtle" />
      </>
    ),
  },
};

export const NotesLike: Story = {
  args: {
    onBack: () => {},
    right: (
      <>
        <IconButton label="Star" onClick={() => {}} icon={<Star />} variant="subtle" />
        <IconButton label="Archive" onClick={() => {}} icon={<Archive />} variant="subtle" />
      </>
    ),
  },
};
