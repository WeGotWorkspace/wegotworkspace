import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within } from "storybook/test";
import { DRIVE_DOCS_EDITOR_STORY_FILES } from "@/drive-core/src/drive-docs-story-files";
import { DriveMainPane } from "@/drive-core/src/drive-main-pane";
import { getDriveStoryFilesInMyDrive } from "@/drive-core/stories/drive-pane-stories.fixtures";
import { useDrivePaneStoryController } from "@/drive-core/stories/drive-pane-stories.harness";
import { DriveStoryScope } from "@/drive-core/stories/drive-story-scope";

function DriveMainPaneHarness({
  preset = "default",
}: {
  preset?: "default" | "empty" | "docsEditor";
}) {
  const controller = useDrivePaneStoryController(
    preset === "empty"
      ? { filesOverride: [] }
      : preset === "docsEditor"
        ? {
            filesOverride: [
              ...getDriveStoryFilesInMyDrive().filter((file) => file.kind === "folder"),
              ...DRIVE_DOCS_EDITOR_STORY_FILES,
            ],
          }
        : undefined,
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
      options: ["default", "empty", "docsEditor"],
    },
  },
} satisfies Meta<typeof DriveMainPaneHarness>;

export default meta;
type Story = StoryObj<typeof DriveMainPaneHarness>;

export const Default: Story = {
  tags: ["vitest-ci"],
  args: { preset: "default" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(/Studio Assets/i)).toBeInTheDocument();
    const input = canvas.getByPlaceholderText("Search in Drive...");
    await userEvent.type(input, "proofs");
    await expect(input).toHaveValue("proofs");
  },
};

export const Empty: Story = {
  args: { preset: "empty" },
};

export const DocsEditorFiles: Story = {
  name: "Docs editor files (.md + .txt)",
  args: { preset: "docsEditor" },
};
