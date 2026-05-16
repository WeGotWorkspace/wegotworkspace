import type { Decorator } from "@storybook/react-vite";

export const meetPaneDecorator: Decorator = (Story) => (
  <div className="meet-workspace" style={{ minHeight: "100dvh" }}>
    <Story />
  </div>
);
