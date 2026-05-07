import type { Meta, StoryObj } from "@storybook/react-vite";
import { Plus, Star } from "lucide-react";
import { FabButton, ListAction, ToolbarButton } from "@/action-buttons/src/action-buttons";

const meta: Meta = {
  title: "Shared/Toolbar & List Actions",
};

export default meta;
type Story = StoryObj;

export const Default: Story = {
  render: () => (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <ListAction label="New item" onClick={() => {}}>
          <Plus className="size-4" />
        </ListAction>
        <ListAction label="Starred" onClick={() => {}} disabled>
          <Star className="size-4" />
        </ListAction>
      </div>
      <div className="flex items-center gap-2">
        <ToolbarButton label="Star" onClick={() => {}}>
          <Star className="size-4" />
        </ToolbarButton>
      </div>
      <div className="flex items-center gap-1 px-2 py-2 rounded-full bg-(--color-ink) w-max">
        <FabButton label="Add" onClick={() => {}}>
          <Plus className="size-4" />
        </FabButton>
      </div>
    </div>
  ),
};
