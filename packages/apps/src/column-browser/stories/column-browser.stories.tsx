import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";
import { Folder } from "lucide-react";
import { ColumnBrowser, type ColumnBrowserItem } from "@/column-browser/src/column-browser";
import "@/column-browser/src/column-browser.css";

const meta = {
  title: "Apps/Drive/Components/ColumnBrowser",
  component: ColumnBrowser,
  parameters: {
    layout: "fullscreen",
  },
  decorators: [
    (Story) => (
      <div className="drive-workspace flex h-[24rem] border">
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof ColumnBrowser>;

export default meta;
type Story = StoryObj<typeof ColumnBrowser>;

const INITIAL_COLUMNS = [
  {
    id: "my-drive",
    title: "My Drive",
    items: [
      { id: "folder-studio", title: "Studio Assets", kind: "folder" as const, icon: undefined },
      {
        id: "file-roadmap",
        title: "Roadmap.md",
        kind: "file" as const,
        icon: <Folder className="size-4" aria-hidden />,
      },
    ],
  },
  {
    id: "studio",
    title: "Studio Assets",
    items: [
      { id: "file-logo", title: "logo.png", kind: "file" as const },
      { id: "file-guide", title: "Brand Guide.pdf", kind: "file" as const },
    ],
  },
];

function ColumnBrowserHarness() {
  const [selectedId, setSelectedId] = useState<string | null>("file-roadmap");
  const onSelectItem = (_columnIndex: number, item: ColumnBrowserItem) => {
    setSelectedId(item.id);
  };
  return (
    <ColumnBrowser
      columns={INITIAL_COLUMNS}
      selectedItemId={selectedId}
      onSelectItem={onSelectItem}
    />
  );
}

export const Default: Story = {
  render: () => <ColumnBrowserHarness />,
};

export const LoadingColumn: Story = {
  name: "Loading column",
  args: {
    columns: [
      {
        id: "my-drive",
        title: "My Drive",
        items: [{ id: "folder-a", title: "Projects", kind: "folder" }],
      },
      {
        id: "projects",
        title: "Projects",
        items: [],
        loading: true,
      },
    ],
    onSelectItem: () => {},
  },
};

export const EmptyFolder: Story = {
  name: "Empty folder",
  args: {
    columns: [
      {
        id: "my-drive",
        title: "My Drive",
        items: [],
        emptyLabel: "This folder is empty",
      },
    ],
    onSelectItem: () => {},
  },
};
