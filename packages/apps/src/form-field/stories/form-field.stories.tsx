import type { Meta, StoryObj } from "@storybook/react-vite";
import { Mail, User } from "lucide-react";
import { Input } from "@/ui/input";
import { FormField } from "../src";

const meta: Meta<typeof FormField> = {
  title: "Shared/Form Field",
  component: FormField,
  tags: ["vitest-ci"],
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
