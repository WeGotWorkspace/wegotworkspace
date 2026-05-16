import type { Meta, StoryObj } from "@storybook/react-vite";
import "@/mail-core/src/mail-workspace.css";
import { MailAttachments } from "../src/mail-attachments";

const meta: Meta<typeof MailAttachments> = {
  title: "Apps/Mail/Mail Attachments",
  component: MailAttachments,
  decorators: [
    (Story) => (
      <div className="mail-workspace mx-auto max-w-3xl rounded-lg border p-8">
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MailAttachments>;

const attachments = [
  { id: "a-1", name: "contract-v4.pdf", type: "application/pdf", size: 2_145_391 },
  { id: "a-2", name: "hero-image.png", type: "image/png", size: 918_442 },
  { id: "a-3", name: "research-notes.md", type: "text/markdown", size: 18_111 },
];

export const DownloadHandlerMode: Story = {
  args: {
    attachments,
    onDownload: () => {},
  },
};

export const DirectUrlMode: Story = {
  args: {
    attachments,
    buildDownloadUrl: (attachment) => `#download-${attachment.id ?? attachment.name}`,
  },
};
