import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContactsNewMenu } from "@/contacts-core/src/contacts-new-menu";
import { defaultContactsLabels } from "@/contacts-core/src/contacts-labels";
import { ContactsStoryScope } from "./contacts-story-scope";

const STORY_NOOP = () => {};

const meta = {
  title: "Apps/Contacts/Components/ContactsNewMenu",
  component: ContactsNewMenu,
  tags: ["autodocs"],
  render: (args) => (
    <ContactsStoryScope className="max-w-xs p-6">
      <ContactsNewMenu {...args} />
    </ContactsStoryScope>
  ),
} satisfies Meta<typeof ContactsNewMenu>;

export default meta;
type Story = StoryObj<typeof ContactsNewMenu>;

export const Default: Story = {
  args: {
    labels: defaultContactsLabels,
    onCreateContact: STORY_NOOP,
    onImportVcf: STORY_NOOP,
  },
};
