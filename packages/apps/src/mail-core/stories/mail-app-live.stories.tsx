import type { Meta, StoryObj } from "@storybook/react-vite";
import { MailApp } from "@/mail-core/src/mail-app";

/**
 * Hits the real WeGotWorkspace HTTP API (via Storybook's `/api/v1` proxy).
 * Not the same as **FromOpenApiShapes**, which uses static in-repo fixtures only.
 */
const meta: Meta<typeof MailApp> = {
  title: "Apps/Mail/App",
  component: MailApp,
  parameters: {
    layout: "fullscreen",
    routerPath: "/mail",
  },
};

export default meta;
type Story = StoryObj<typeof MailApp>;

export const Default: Story = {
  render: () => <MailApp />,
};
