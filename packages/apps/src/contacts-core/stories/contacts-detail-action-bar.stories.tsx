import type { Meta, StoryObj } from "@storybook/react-vite";
import { ContactsDetailActionBar } from "@/contacts-core/src/contacts-detail-action-bar";
import { defaultContactsLabels } from "@/contacts-core/src/contacts-labels";
import { ContactsStoryScope } from "./contacts-story-scope";

function ContactsDetailActionBarHarness({
  editMode = false,
  createMode = false,
}: {
  editMode?: boolean;
  createMode?: boolean;
}) {
  return (
    <ContactsStoryScope variant="detail">
      <div className="sticky top-0 z-10 border-b px-2 py-2">
        <ContactsDetailActionBar
          labels={defaultContactsLabels}
          canEdit
          editMode={editMode}
          createMode={createMode}
          closeMobileDetail={() => {}}
          onEdit={() => {}}
          onDelete={() => {}}
          onSave={() => {}}
          onCancel={() => {}}
        />
      </div>
    </ContactsStoryScope>
  );
}

const meta = {
  title: "Apps/Contacts/Panes/Detail action bar",
  component: ContactsDetailActionBarHarness,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof ContactsDetailActionBarHarness>;

export default meta;
type Story = StoryObj<typeof ContactsDetailActionBarHarness>;

export const ReadMode: Story = {
  args: {},
};

export const EditMode: Story = {
  args: { editMode: true },
};

export const CreateMode: Story = {
  args: { createMode: true, editMode: true },
};
