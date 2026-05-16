import type { Meta, StoryObj } from "@storybook/react-vite";
import { MeetCallToolbar } from "@/meet-core/src/meet-call-toolbar";
import { meetLabels } from "@/meet-core/src/meet-labels";
import {
  STORY_MEET_DEVICES,
  STORY_MEET_MICROPHONES,
  STORY_MEET_SPEAKERS,
} from "@/meet-core/stories/meet-pane-stories.fixtures";
import { meetRoomPaneDecorator } from "@/meet-core/stories/meet-panes.stories.decorator";
import {
  meetStoryParameters,
  STORY_NOOP,
  storyBooleanControl,
} from "@/meet-core/stories/meet-story-shared";

const meta = {
  title: "Apps/Meet/Components/MeetCallToolbar",
  component: MeetCallToolbar,
  decorators: [meetRoomPaneDecorator],
  parameters: meetStoryParameters({
    snippet: `<MeetCallToolbar
  micOn
  videoOn
  screenOn={false}
  callExitLabel={meetLabels.endCall}
  callExitTitle={meetLabels.endCallTitle}
  callExitDescription={meetLabels.endCallDescription}
  cameras={cameras}
  microphones={microphones}
  speakers={speakers}
  activeCamera={cameraId}
  activeMic={micId}
  activeSpeaker={speakerId}
  onToggleMic={toggleMic}
  onToggleVideo={toggleVideo}
  onToggleScreenShare={toggleScreenShare}
  onCameraChange={setCameraId}
  onMicrophoneChange={setMicId}
  onSpeakerChange={setSpeakerId}
  onConfirmExit={confirmExit}
/>`,
  }),
  render: (args) => (
    <div className="flex flex-1 flex-col justify-end pb-8">
      <MeetCallToolbar {...args} />
    </div>
  ),
  argTypes: {
    micOn: storyBooleanControl,
    videoOn: storyBooleanControl,
    screenOn: storyBooleanControl,
    callExitLabel: { table: { disable: true } },
    callExitTitle: { table: { disable: true } },
    callExitDescription: { table: { disable: true } },
  },
} satisfies Meta<typeof MeetCallToolbar>;

export default meta;
type Story = StoryObj<typeof MeetCallToolbar>;

const baseArgs = {
  micOn: true,
  videoOn: true,
  screenOn: false,
  callExitLabel: meetLabels.endCall,
  callExitTitle: meetLabels.endCallTitle,
  callExitDescription: meetLabels.endCallDescription,
  cameras: STORY_MEET_DEVICES,
  microphones: STORY_MEET_MICROPHONES,
  speakers: STORY_MEET_SPEAKERS,
  activeCamera: STORY_MEET_DEVICES[0]!.id,
  activeMic: STORY_MEET_MICROPHONES[0]!.id,
  activeSpeaker: STORY_MEET_SPEAKERS[0]!.id,
  onToggleMic: STORY_NOOP,
  onToggleVideo: STORY_NOOP,
  onToggleScreenShare: STORY_NOOP,
  onCameraChange: STORY_NOOP,
  onMicrophoneChange: STORY_NOOP,
  onSpeakerChange: STORY_NOOP,
  onConfirmExit: STORY_NOOP,
};

export const Default: Story = {
  name: "Default",
  args: baseArgs,
};

export const ScreenSharing: Story = {
  name: "Screen sharing",
  args: { ...baseArgs, screenOn: true },
};

export const MediaOff: Story = {
  name: "Media off",
  args: { ...baseArgs, micOn: false, videoOn: false },
};

export const LeaveCall: Story = {
  name: "Leave call",
  args: {
    ...baseArgs,
    callExitLabel: meetLabels.leaveCall,
    callExitTitle: meetLabels.leaveCallTitle,
    callExitDescription: meetLabels.leaveCallDescription,
  },
};
