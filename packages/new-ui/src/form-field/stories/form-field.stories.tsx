import type { Meta, StoryObj } from "@storybook/react-vite";
import { Mail, User } from "lucide-react";
import { Input } from "@/ui/input";
import { FormField } from "../src/form-field";

const meta: Meta<typeof FormField> = {
  title: "Shared/Form Field",
  component: FormField,
  decorators: [
    (Story) => (
      <div
        className="max-w-lg p-6 rounded-xl border"
        style={{ backgroundColor: "var(--color-cream, #f5f1e8)" }}
      >
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof FormField>;

export const Readonly: Story = {
  args: {
    label: "Username",
    readOnly: true,
    icon: <User className="size-3.5 opacity-70" />,
    children: <Input value="elias.linden" readOnly className="cursor-default" />,
  },
};

export const Editable: Story = {
  args: {
    label: "Email",
    icon: <Mail className="size-3.5 opacity-70" />,
    children: <Input defaultValue="elias@northlight.studio" type="email" />,
  },
};
