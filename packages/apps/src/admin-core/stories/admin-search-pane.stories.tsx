import type { Meta, StoryObj } from "@storybook/react-vite";
import type { AdminStoryDataOverride } from "@/admin-core/stories/admin-pane-stories.harness";
import { AdminSearchPane } from "@/admin-core/src/admin-search-pane";
import { useAdminPaneStoryController } from "@/admin-core/stories/admin-pane-stories.harness";
import { AdminStoryScope } from "@/admin-core/stories/admin-story-scope";

function SearchPaneHarness({ dataOverride }: { dataOverride?: AdminStoryDataOverride }) {
  const controller = useAdminPaneStoryController(dataOverride);
  return (
    <AdminStoryScope>
      <AdminSearchPane controller={controller} />
    </AdminStoryScope>
  );
}

const meta = {
  title: "Apps/Admin/Panes/Search",
  component: AdminSearchPane,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof AdminSearchPane>;

export default meta;
type Story = StoryObj<typeof AdminSearchPane>;

export const Default: Story = {
  render: () => <SearchPaneHarness />,
};

export const InProgress: Story = {
  render: () => (
    <SearchPaneHarness
      dataOverride={{
        searchReindex: {
          inProgress: true,
          phase: "indexing_files",
          phaseProgress: { completed: 420, total: 1000, percent: 42 },
          cancelRequested: false,
          lastResult: null,
          logLines: ["[2024-06-01T10:00:00Z] Started full search reindex."],
        },
      }}
    />
  ),
};

export const WithLog: Story = {
  render: () => (
    <SearchPaneHarness
      dataOverride={{
        searchReindex: {
          inProgress: false,
          phase: null,
          phaseProgress: null,
          cancelRequested: false,
          lastResult: {
            ok: true,
            message: "Last reindex completed successfully.",
            finishedAt: "2024-06-01T09:18:00.000Z",
          },
          logLines: [
            "[2024-06-01T09:00:00Z] Started full search reindex.",
            "[2024-06-01T09:12:00Z] Indexed 1,024 files.",
            "[2024-06-01T09:18:00Z] Search reindex completed.",
          ],
        },
      }}
    />
  ),
};
