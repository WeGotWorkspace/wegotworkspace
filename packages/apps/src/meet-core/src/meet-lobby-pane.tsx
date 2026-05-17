import {
  Hand,
  Mic,
  MicOff,
  Settings as SettingsIcon,
  Video,
  VideoOff,
} from "lucide-react";
import { Button } from "@/button/src/button";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { MeetAvatar } from "@/meet-core/src/meet-avatar";
import { MeetCircleToggle } from "@/meet-core/src/meet-circle-toggle";
import { MeetDeviceRow } from "@/meet-core/src/meet-device-row";
import type { MeetControllerState } from "@/meet-core/src/meet-controller-state";
import type { MeetDeviceOption } from "@/meet-core/src/meet-device-utils";
import { meetDeviceIdForOption } from "@/meet-core/src/meet-device-utils";
import { MeetLobbyStatusCard } from "@/meet-core/src/meet-lobby-status-card";
import { meetLabels } from "@/meet-core/src/meet-labels";

export type MeetLobbyPaneProps = {
  controller: MeetControllerState;
  displayName: string;
  inJoinFlow: boolean;
  hasSignedInIdentity: boolean;
  invitedRoom: string | null;
  waitingForAdmission: boolean;
  knockDots: number;
  cameras: MeetDeviceOption[];
  microphones: MeetDeviceOption[];
  speakers: MeetDeviceOption[];
  activeCamera: string;
  activeMic: string;
  activeSpeaker: string;
  onSpeakerChange: (value: string) => void;
  endedMessage: string | null;
  showMissingInviteScreen: boolean;
  showInviteCheckingScreen: boolean;
};

export function MeetLobbyPane({
  controller,
  displayName,
  inJoinFlow,
  hasSignedInIdentity,
  invitedRoom,
  waitingForAdmission,
  knockDots,
  cameras,
  microphones,
  speakers,
  activeCamera,
  activeMic,
  activeSpeaker,
  onSpeakerChange,
  endedMessage,
  showMissingInviteScreen,
  showInviteCheckingScreen,
}: MeetLobbyPaneProps) {
  if (endedMessage) {
    return (
      <MeetLobbyStatusCard
        title={meetLabels.callEndedTitle}
        body={endedMessage}
        titleSize="lg"
      />
    );
  }

  if (showMissingInviteScreen) {
    return (
      <MeetLobbyStatusCard
        title={meetLabels.missingInviteTitle}
        body={meetLabels.missingInviteBody}
      />
    );
  }

  if (showInviteCheckingScreen) {
    return (
      <MeetLobbyStatusCard
        title={meetLabels.checkingInviteTitle}
        body={meetLabels.checkingInviteBody}
        titleSize="md"
      />
    );
  }

  return (
    <div className="w-full max-w-md">
      <h1 className="meet-workspace__title meet-workspace__title--hero">
        {inJoinFlow ? meetLabels.lobbyJoinTitle : meetLabels.lobbyHostTitle}
      </h1>

      <div className="meet-workspace__preview">
        {controller.videoOn ? (
          <video
            ref={controller.localVideoRef}
            autoPlay
            muted
            playsInline
            className="meet-workspace__preview-video"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <MeetAvatar name={displayName} size={84} />
          </div>
        )}
        <div className="meet-workspace__preview-controls">
          <MeetCircleToggle
            on={controller.micOn}
            onClick={controller.toggleMic}
            OnIcon={Mic}
            OffIcon={MicOff}
            label={controller.micOn ? "Mute" : "Unmute"}
          />
          <MeetCircleToggle
            on={controller.videoOn}
            onClick={controller.toggleVideo}
            OnIcon={Video}
            OffIcon={VideoOff}
            label={controller.videoOn ? "Stop video" : "Start video"}
          />
        </div>
        {waitingForAdmission ? (
          <div className="meet-workspace__knock-overlay">
            <div className="meet-workspace__knock-icon">
              <Hand className="size-7" />
            </div>
            <div className="text-base font-semibold">
              {meetLabels.knocking}
              {".".repeat(knockDots)}
            </div>
            <div className="mt-1 text-xs" style={{ color: "var(--meet-muted)" }}>
              {meetLabels.knockingHint}
            </div>
          </div>
        ) : null}
      </div>

      <div className="meet-workspace__form">
        <div className="meet-workspace__field">
          <Label className="meet-workspace__field-label">{meetLabels.displayNameLabel}</Label>
          <Input
            value={controller.displayName}
            onChange={(event) => controller.setDisplayName(event.target.value)}
            className="meet-workspace__name-input"
          />
        </div>

        <MeetDeviceRow
          icon={<Video />}
          label={meetLabels.cameraLabel}
          value={activeCamera}
          onChange={(id) => {
            const deviceId = meetDeviceIdForOption(cameras, id);
            if (!deviceId) return;
            void controller.switchCamera(deviceId);
          }}
          options={cameras}
        />
        <MeetDeviceRow
          icon={<Mic />}
          label={meetLabels.microphoneLabel}
          value={activeMic}
          onChange={(id) => {
            const deviceId = meetDeviceIdForOption(microphones, id);
            if (!deviceId) return;
            void controller.switchMic(deviceId);
          }}
          options={microphones}
        />
        <MeetDeviceRow
          icon={<SettingsIcon />}
          label={meetLabels.speakerLabel}
          value={activeSpeaker}
          onChange={onSpeakerChange}
          options={speakers}
        />

        {!waitingForAdmission ? (
          <Button
            onClick={() => {
              if (invitedRoom) {
                void (hasSignedInIdentity
                  ? controller.joinRoom(invitedRoom)
                  : controller.requestJoin(invitedRoom));
                return;
              }
              if (!hasSignedInIdentity) return;
              void controller.startMeeting();
            }}
            className="meet-workspace__primary-button"
            disabled={!hasSignedInIdentity && !invitedRoom}
          >
            {invitedRoom
              ? hasSignedInIdentity
                ? meetLabels.joinMeeting
                : meetLabels.askToJoin
              : hasSignedInIdentity
                ? meetLabels.startMeeting
                : meetLabels.inviteRequired}
          </Button>
        ) : (
          <Button
            onClick={() => void controller.leave()}
            variant="outline"
            className="meet-workspace__secondary-button"
          >
            {meetLabels.cancelRequest}
          </Button>
        )}
        {controller.error ? <p className="meet-workspace__error">{controller.error}</p> : null}
      </div>
    </div>
  );
}
