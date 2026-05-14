import type { Meta, StoryObj } from "@storybook/react-vite";
import { Eraser, RefreshCw } from "lucide-react";
import { Input } from "@/ui/input";
import { Button } from "@/app-button/src/button";
import { Card } from "../src/card";
import { FormField } from "@/form-field/src/form-field";

const meta: Meta<typeof Card> = {
  title: "Shared/Card",
  component: Card,
  decorators: [
    (Story) => (
      <div
        className="max-w-xl p-6 rounded-xl border"
        style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof Card>;

export const ReadonlySummary: Story = {
  render: () => (
    <Card title="Readonly">
      <FormField label="Username" readOnly>
        <Input value="elias.linden" readOnly className="cursor-default" />
      </FormField>
      <FormField label="Email" readOnly>
        <Input value="elias@northlight.studio" readOnly className="cursor-default" />
      </FormField>
    </Card>
  ),
};

export const EditableFormLike: Story = {
  render: () => (
    <Card title="Identity">
      <FormField label="Display name">
        <Input defaultValue="Elias Linden" />
      </FormField>
      <FormField label="Email">
        <Input defaultValue="elias@northlight.studio" type="email" />
      </FormField>
      <div className="flex justify-end pt-2">
        <Button
          label="Save"
          variant="subtle"
          style={{ backgroundColor: "#da9fb8", color: "var(--color-ink)" }}
        />
      </div>
    </Card>
  ),
};

export const WithHeaderIconActions: Story = {
  render: () => (
    <Card
      title="Update log"
      iconActions={[
        {
          label: "Refresh",
          icon: <RefreshCw className="size-4" />,
          onClick: () => {},
        },
        {
          label: "Clear",
          icon: <Eraser className="size-4" />,
          onClick: () => {},
        },
      ]}
    >
      <p className="text-sm opacity-80">Card header supports one or more icon actions.</p>
    </Card>
  ),
};
