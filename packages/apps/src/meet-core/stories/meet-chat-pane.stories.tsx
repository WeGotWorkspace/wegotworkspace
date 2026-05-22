import type { Meta, StoryObj } from "@storybook/react-vite";
import { MeetChatPane } from "@/meet-core/src/meet-chat-pane";
import {
  MeetChatPaneStory,
  type MeetChatPaneStoryArgs,
} from "@/meet-core/stories/meet-story-renders";
import {
  meetStoryParameters,
  storyBooleanControl,
  storyTextControl,
} from "@/meet-core/stories/meet-story-shared";

const meta = {
  title: "Apps/Meet/Panes/MeetChatPane",
  component: MeetChatPane,
  render: (args) => <MeetChatPaneStory {...args} />,
  parameters: {
    layout: "fullscreen",
    ...meetStoryParameters({
      snippet: `<MeetChatPane
  messages={messages}
  draft={draft}
  onDraftChange={setDraft}
  onSend={send}
/>`,
    }),
  },
  argTypes: {
    draft: storyTextControl,
    hasMessages: storyBooleanControl,
  },
} satisfies Meta<MeetChatPaneStoryArgs>;

export default meta;
type Story = StoryObj<MeetChatPaneStoryArgs>;

export const WithMessages: Story = {
  name: "With messages",
  args: { draft: "", hasMessages: true },
};

export const Empty: Story = {
  name: "Empty",
  args: { draft: "", hasMessages: false },
};

export const Composing: Story = {
  name: "Composing",
  args: { draft: "Thanks — joining in a second.", hasMessages: true },
};
