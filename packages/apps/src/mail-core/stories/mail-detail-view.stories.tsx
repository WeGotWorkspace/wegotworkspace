import type { Meta, StoryObj } from "@storybook/react-vite";
import { MailDetailView } from "../src/mail-detail-view";
import { mailStoryLabels } from "@/mail-core/src/mail-app.stories.fixtures";

const meta: Meta<typeof MailDetailView> = {
  title: "Apps/Mail/Mail Detail View",
  component: MailDetailView,
  decorators: [
    (Story) => (
      <div
        className="max-w-3xl mx-auto p-8 rounded-lg border"
        style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof MailDetailView>;

const L = mailStoryLabels;

export const Default: Story = {
  args: {
    mailId: "m-demo",
    mailbox: "Inbox",
    date: "10:42",
    title: "Revised proofs for the autumn issue",
    emptySubjectLabel: L.noSubject,
    from: "Hana Ito",
    senderMetaLine: `hana@studio-meridian.jp${L.detailToViewer("me")}`,
    body: [
      "I've attached the second pass — the type sits better now, and we tightened the gutter on the spreads you flagged.",
      "Let me know if the new heading weight reads warmer to you.",
    ],
    detailLoaded: true,
  },
};

export const NoSubject: Story = {
  args: {
    ...Default.args,
    title: "",
  },
};

export const WithAttachments: Story = {
  args: {
    ...Default.args,
    attachments: [
      { id: "a-1", name: "autumn-proof-v2.pdf", type: "application/pdf", size: 1_844_640 },
      { id: "a-2", name: "cover-options.zip", type: "application/zip", size: 8_612_944 },
    ],
  },
};
