import { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import type { WgwUnifiedSearchData, WgwUnifiedSearchResult } from "@/lib/api/wgw/search";
import type { WorkspaceSession } from "@/lib/workspace/workspace-session";
import { DocsHomeWorkspace } from "@/docs-core/src/docs-home-workspace";
import { DocsHomePane } from "@/docs-core/src/docs-home-pane";
import { docsLabels } from "@/docs-core/src/docs-labels";
import { mapDocsHomeResults, type DocsHomeFetcher } from "@/docs-core/src/use-docs-home-list";
import type { ViewMode } from "@/view-mode-toggle/src/view-mode-toggle";
import "@/docs-core/src/docs-workspace.css";
import "@/docs-core/src/docs-home-workspace.css";

const session: WorkspaceSession = {
  user: {
    displayName: "Alice Rivera",
    username: "alice",
    email: "alice@example.com",
  },
  viewerInboxLabel: "me",
};

const DAY = 24 * 60 * 60;
const NOW = 1_750_000_000;

/** Mixed My Drive + Groups fixtures, newest first. */
const FIXTURES: WgwUnifiedSearchResult[] = [
  fixture(1, "users/alice/Roadmap 2026.md", "Roadmap 2026", 0),
  fixture(2, "groups/engineering/RFC Storage Tiers.md", "RFC: Storage Tiers", 1),
  fixture(3, "users/alice/Notes/Standup.txt", "Standup", 2),
  fixture(4, "groups/design/Brand Voice.markdown", "Brand Voice", 4),
  fixture(5, "users/alice/Personal Journal.md", "Personal Journal", 6),
  fixture(6, "groups/engineering/Onboarding.md", "Onboarding", 9),
  fixture(7, "groups/design/Icon Audit.md", "Icon Audit", 12),
  fixture(8, "users/alice/Archive/Old Plan.txt", "Old Plan", 20),
];

function fixture(
  id: number,
  sourceKey: string,
  title: string,
  ageDays: number,
): WgwUnifiedSearchResult {
  const extension = sourceKey.split(".").pop() ?? "md";
  return {
    id,
    sourceType: "file",
    sourceKey,
    title,
    extension,
    category: "document",
    contentType: extension === "txt" ? "text/plain" : "text/markdown",
    size: 1024 + id * 37,
    modifiedAt: NOW - ageDays * DAY,
    snippet: `Preview of ${title}…`,
    metadata: { path: `/${sourceKey}` },
  };
}

/** Mock fetcher: 3-per-page browse with offset/hasMore, optional `q` title filter. */
function createPaginatedFetcher(all: WgwUnifiedSearchResult[]): DocsHomeFetcher {
  const PAGE = 3;
  return async (params) => {
    const q = (params.q ?? "").trim().toLowerCase();
    const filtered = q ? all.filter((item) => item.title.toLowerCase().includes(q)) : all;
    const start = params.offset ?? 0;
    const results = filtered.slice(start, start + PAGE);
    const data: WgwUnifiedSearchData = {
      query: params.q ?? "",
      limit: params.limit ?? PAGE,
      offset: start,
      hasMore: start + results.length < filtered.length,
      sources: params.sources ?? ["file"],
      filters: {
        categories: params.categories,
        extensions: params.extensions,
      },
      results,
    };
    return data;
  };
}

const meta: Meta<typeof DocsHomeWorkspace> = {
  title: "Apps/Docs/Home",
  component: DocsHomeWorkspace,
  tags: ["autodocs"],
  parameters: {
    layout: "fullscreen",
  },
  args: {
    session,
    onOpenFile: () => {},
    onLogout: () => {},
  },
};

export default meta;
type Story = StoryObj<typeof DocsHomeWorkspace>;

export const Default: Story = {
  name: "Browse (paginated)",
  args: {
    fetcher: createPaginatedFetcher(FIXTURES),
  },
};

export const Empty: Story = {
  args: {
    fetcher: createPaginatedFetcher([]),
  },
};

/** Pane-only surface (header + list) with static mock data and grid/list toggle. */
export const Pane: StoryObj<typeof DocsHomePane> = {
  render: () => <DocsHomePaneHarness />,
  parameters: {
    docs: {
      description: {
        story: "The `DocsHomePane` in isolation: view-mode toggle, Location column, and load more.",
      },
    },
  },
};

function DocsHomePaneHarness() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [query, setQuery] = useState("");
  const files = mapDocsHomeResults(FIXTURES, session.user.username ?? "alice");
  return (
    <div className="docs-workspace docs-home-workspace" style={{ height: "100dvh" }}>
      <DocsHomePane
        labels={docsLabels}
        files={files}
        loading={false}
        loadingMore={false}
        hasMore
        error={null}
        query={query}
        onQueryChange={setQuery}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onLoadMore={() => {}}
        onOpenFile={() => {}}
        sidebarOpen={false}
        onToggleSidebar={() => {}}
      />
    </div>
  );
}
