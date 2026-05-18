import type { Meta, StoryObj } from "@storybook/react-vite";
import { DriveMainPane } from "@/drive-core/src/drive-main-pane";
import { useDrivePaneStoryController } from "@/drive-core/stories/drive-pane-stories.harness";
import { DriveStoryScope } from "@/drive-core/stories/drive-story-scope";

function DriveMainPaneHarness({ preset = "default" }: { preset?: "default" | "empty" }) {
  const controller = useDrivePaneStoryController(
    preset === "empty" ? { filesOverride: [] } : undefined,
  );

  return (
    <DriveStoryScope className="flex h-dvh flex-col">
      <DriveMainPane controller={controller} />
    </DriveStoryScope>
  );
}

const meta = {
  title: "Apps/Drive/Panes/DriveMainPane",
  component: DriveMainPaneHarness,
  parameters: {
    layout: "fullscreen",
  },
  argTypes: {
    preset: {
      control: "select",
      options: ["default", "empty"],
    },
  },
} satisfies Meta<typeof DriveMainPaneHarness>;

export default meta;
type Story = StoryObj<typeof DriveMainPaneHarness>;

export const Default: Story = {
  args: { preset: "default" },
};

export const Empty: Story = {
  args: { preset: "empty" },
};
