import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, screen, userEvent } from "storybook/test";
import { fn } from "storybook/test";
import { ContactsConflictDialog } from "@/contacts-core/src/contacts-conflict-dialog";
import { defaultContactsLabels } from "@/contacts-core/src/contacts-labels";
import { ContactsStoryScope } from "./contacts-story-scope";

const meta = {
  title: "Apps/Contacts/Conflict Dialog",
  component: ContactsConflictDialog,
  parameters: { layout: "fullscreen" },
  args: {
    open: true,
    contactName: "Jane Doe",
    labels: defaultContactsLabels,
    onKeepLocal: fn(),
    onUseServer: fn(),
    onOpenChange: fn(),
  },
  render: (args) => (
    <ContactsStoryScope>
      <ContactsConflictDialog {...args} />
    </ContactsStoryScope>
  ),
} satisfies Meta<typeof ContactsConflictDialog>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  tags: ["vitest-ci"],
  play: async ({ args }) => {
    await expect(await screen.findByText("Sync conflict")).toBeInTheDocument();
    const keepMine = screen.getByRole("button", { name: "Keep mine" });
    const useServer = screen.getByRole("button", { name: "Use server version" });
    await expect(keepMine).toBeInTheDocument();
    await expect(useServer).toBeInTheDocument();
    await userEvent.click(keepMine);
    await expect(args.onKeepLocal).toHaveBeenCalledTimes(1);
    await userEvent.click(useServer);
    await expect(args.onUseServer).toHaveBeenCalledTimes(1);
  },
};

export const WithQueue: Story = {
  args: {
    remainingCount: 2,
  },
};
