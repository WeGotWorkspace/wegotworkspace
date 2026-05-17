import type { Meta, StoryObj } from "@storybook/react-vite";
import { LoginScreen } from "@/login-core/src/login-screen";

const meta: Meta<typeof LoginScreen> = {
  title: "Apps/Login",
  component: LoginScreen,
  parameters: {
    layout: "fullscreen",
    routerPath: "/login",
  },
};

export default meta;
type Story = StoryObj<typeof LoginScreen>;

export const Default: Story = {
  render: () => <LoginScreen />,
};
