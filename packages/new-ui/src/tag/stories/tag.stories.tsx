import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tag, TagGroup } from "../src/tag";

const meta: Meta<typeof TagGroup> = {
  title: "Shared/Tag Group",
  component: TagGroup,
  decorators: [
    (Story) => (
      <div
        className="max-w-md p-6 rounded-lg border"
        style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof TagGroup>;

export const Readonly: Story = {
  args: {
    tags: ["ideas", "draft"],
    readonly: true,
  },
};

export const Editable: Story = {
  args: {
    tags: ["ideas", "draft"],
    readonly: false,
    onAdd: () => {},
    onRemoveTag: () => {},
  },
};

export const TagAtoms: Story = {
  name: "Tag (atoms)",
  render: () => (
    <div className="flex flex-wrap gap-2">
      <Tag label="readonly" />
      <Tag label="editable" removable onRemove={() => {}} />
    </div>
  ),
};
