import type { Meta, StoryObj } from "@storybook/react-vite";
import { Archive, Circle, FolderInput, Star, Trash2 } from "lucide-react";
import { MailMultiSelectionView } from "../src/mail-multi-selection-view";
import type { Mail } from "@/types/mail";

const meta: Meta<typeof MailMultiSelectionView> = {
  title: "Apps/Mail/Mail Multi Selection View",
  component: MailMultiSelectionView,
  decorators: [
    (Story) => (
      <div
        className="mx-auto max-w-3xl rounded-lg border p-8"
        style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MailMultiSelectionView>;

const selected: Mail[] = [
  {
    id: "m-1",
    folder: "INBOX",
    uid: 101,
    from: "Naomi West",
    email: "naomi@example.com",
    mailbox: "Inbox",
    unread: true,
    starred: true,
    notebook: "Naomi West",
    category: "Inbox",
    date: "2026-05-06T10:10:00Z",
    title: "Kickoff notes",
    excerpt: "First draft attached.",
    body: ["First draft attached."],
    tags: [],
    wordCount: 3,
  },
  {
    id: "m-2",
    folder: "INBOX",
    uid: 102,
    from: "Kai Olson",
    email: "kai@example.com",
    mailbox: "Inbox",
    unread: false,
    starred: false,
    notebook: "Kai Olson",
    category: "Inbox",
    date: "2026-05-06T09:03:00Z",
    title: "Budget update",
    excerpt: "Latest numbers look good.",
    body: ["Latest numbers look good."],
    tags: [],
    wordCount: 4,
  },
  {
    id: "m-3",
    folder: "ARCHIVE",
    uid: 103,
    from: "Editorial",
    email: "editorial@example.com",
    mailbox: "Archive",
    unread: true,
    starred: false,
    notebook: "Editorial",
    category: "Archive",
    date: "2026-05-05T18:22:00Z",
    title: "Final copy",
    excerpt: "Ready for sign-off.",
    body: ["Ready for sign-off."],
    tags: [],
    wordCount: 3,
  },
];

export const Default: Story = {
  args: {
    selected,
    actions: [
      { id: "move", label: "Move to mailbox", icon: <FolderInput className="size-4" /> },
      { id: "unread", label: "Mark as unread", icon: <Circle className="size-4" /> },
      { id: "star", label: "Star", icon: <Star className="size-4" /> },
      { id: "archive", label: "Archive", icon: <Archive className="size-4" /> },
      { id: "trash", label: "Trash", icon: <Trash2 className="size-4" /> },
    ],
  },
};

export const CustomTitle: Story = {
  args: {
    selected,
    title: (count) => `Batch actions for ${count} threads`,
    label: "Batch mode",
  },
};
