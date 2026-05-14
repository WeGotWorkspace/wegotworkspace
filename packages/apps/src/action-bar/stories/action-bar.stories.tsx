import type { Meta, StoryObj } from "@storybook/react-vite";
import { Archive, Forward, Reply, Star } from "lucide-react";
import { IconButton } from "@/button/src/button";
import { TOOLBAR_ICON_BUTTON_STYLE } from "@/button/src/icon-button-presets";
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
        <IconButton
          label="Reply"
          onClick={() => {}}
          icon={<Reply />}
          variant="subtle"
          style={TOOLBAR_ICON_BUTTON_STYLE}
        />
        <IconButton
          label="Forward"
          onClick={() => {}}
          icon={<Forward />}
          variant="subtle"
          style={TOOLBAR_ICON_BUTTON_STYLE}
        />
      </>
    ),
    right: (
      <>
        <IconButton
          label="Star"
          onClick={() => {}}
          icon={<Star />}
          variant="subtle"
          style={TOOLBAR_ICON_BUTTON_STYLE}
        />
        <IconButton
          label="Archive"
          onClick={() => {}}
          icon={<Archive />}
          variant="subtle"
          style={TOOLBAR_ICON_BUTTON_STYLE}
        />
      </>
    ),
  },
};

export const NotesLike: Story = {
  args: {
    onBack: () => {},
    right: (
      <>
        <IconButton
          label="Star"
          onClick={() => {}}
          icon={<Star />}
          variant="subtle"
          style={TOOLBAR_ICON_BUTTON_STYLE}
        />
        <IconButton
          label="Archive"
          onClick={() => {}}
          icon={<Archive />}
          variant="subtle"
          style={TOOLBAR_ICON_BUTTON_STYLE}
        />
      </>
    ),
  },
};
