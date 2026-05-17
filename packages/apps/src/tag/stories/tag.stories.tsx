import type { Meta, StoryObj } from "@storybook/react-vite";
import { Tag, TagGroup } from "../src/tag";

const meta: Meta<typeof TagGroup> = {
  title: "Shared/Tag Group",
  component: TagGroup,
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
