import type { Meta, StoryObj } from "@storybook/react-vite";
import { PathBreadcrumb } from "@/path-breadcrumb/src/path-breadcrumb";

const meta = {
  title: "Shared/PathBreadcrumb",
  component: PathBreadcrumb,
  tags: ["autodocs"],
} satisfies Meta<typeof PathBreadcrumb>;

export default meta;
type Story = StoryObj<typeof PathBreadcrumb>;

export const SingleSegment: Story = {
  name: "Single segment",
  args: {
    items: [{ label: "My Drive", path: null }],
    onNavigate: () => {},
  },
};

export const NestedPath: Story = {
  name: "Nested path",
  args: {
    items: [
      { label: "My Drive", path: "My Drive" },
      { label: "Studio Assets", path: "My Drive/Studio Assets" },
    ],
    onNavigate: () => {},
  },
};
