import type { Meta, StoryObj } from "@storybook/react-vite";
import { SearchBar } from "@/search-bar/src/search-bar";

const meta = {
  title: "Shared/SearchBar",
  component: SearchBar,
  tags: ["autodocs", "vitest-ci"],
} satisfies Meta<typeof SearchBar>;

export default meta;
type Story = StoryObj<typeof SearchBar>;

export const Empty: Story = {
  args: {
    placeholder: "Search…",
    value: "",
    onSearch: () => {},
  },
};

export const WithQuery: Story = {
  name: "With query",
  args: {
    placeholder: "Search in Drive…",
    value: "proofs",
    onSearch: () => {},
  },
};
