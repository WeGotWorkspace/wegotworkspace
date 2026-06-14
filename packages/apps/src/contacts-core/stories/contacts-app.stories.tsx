import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, within, waitFor } from "storybook/test";
import { createContactsAppBootstrap } from "@/lib/api/mock/contacts-bootstrap";
import { ContactsWorkspace } from "@/contacts-core/src/contacts-workspace";
import { contactsStorySpies, createContactsStoryOperations } from "./contacts-pane-stories.harness";

const bootstrap = createContactsAppBootstrap();
const operations = createContactsStoryOperations(bootstrap.data.cards);

const meta: Meta<typeof ContactsWorkspace> = {
  title: "Apps/Contacts",
  component: ContactsWorkspace,
  parameters: {
    layout: "fullscreen",
    viewport: {
      defaultViewport: "desktop",
    },
  },
};

export default meta;
type Story = StoryObj<typeof ContactsWorkspace>;

export const Default: Story = {
  tags: ["vitest-ci"],
  args: {
    ...bootstrap,
    listLoading: false,
    operations,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByText("Jane Doe"));
    await waitFor(() => {
      expect(canvas.getByRole("heading", { level: 1, name: "Jane Doe" })).toBeInTheDocument();
    });

    await userEvent.click(canvas.getByRole("button", { name: "Edit" }));
    const phoneInput = canvas.getByDisplayValue("+1-555-0101");
    await userEvent.clear(phoneInput);
    await userEvent.type(phoneInput, "+1-555-0199");
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));

    await waitFor(
      () => {
        expect(contactsStorySpies.patchCalls.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    const patch = contactsStorySpies.patchCalls.at(-1)?.patch;
    expect(patch?.phones).toEqual({
      "550e8400-e29b-41d4-a716-446655440013": { number: "+1-555-0199" },
    });
    expect(patch).not.toHaveProperty("@type");

    const createButtons = canvas.getAllByRole("button", { name: "New contact" });
    await userEvent.click(createButtons[0]);
    await userEvent.type(canvas.getByLabelText("Full name"), "Pat Example");
    await userEvent.click(canvas.getByRole("button", { name: "Save" }));

    await waitFor(
      () => {
        expect(contactsStorySpies.createCalls.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    const createBody = contactsStorySpies.createCalls.at(-1);
    expect(createBody).not.toHaveProperty("@type");
    expect(createBody).not.toHaveProperty("version");
    expect(createBody).not.toHaveProperty("id");
    expect(createBody?.name).toEqual({ full: "Pat Example" });
  },
};
