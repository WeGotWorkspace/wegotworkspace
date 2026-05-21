import { Input } from "@/ui/input";
import { Card } from "@/card/src/card";
import { FieldLabelRow } from "@/ui/field-label-row";
import type { InstallControllerState } from "@/install-core/src/use-install-controller";
import {
  InstallFeatureRow,
  InstallPasswordInput,
} from "@/install-core/src/install-workspace-widgets";
import { installWorkspacePaneClasses as c } from "@/install-core/src/install-workspace.styles";

export function InstallMeetPane({
  controller,
}: {
  controller: Pick<InstallControllerState, "meet" | "setMeet">;
}) {
  const { meet, setMeet } = controller;

  return (
    <>
      <Card title="Voice & video">
        <InstallFeatureRow
          label="Enable TURN server"
          desc="Relay voice and video when direct peer connections are blocked."
          value={meet.enabled}
          onChange={(value) => setMeet((current) => ({ ...current, enabled: value }))}
        />
      </Card>
      {meet.enabled ? (
        <Card title="TURN server">
          <FieldLabelRow label="TURN URL">
            <Input
              value={meet.turn}
              onChange={(event) => setMeet((current) => ({ ...current, turn: event.target.value }))}
              placeholder="turn:turn.example.com:3478"
            />
          </FieldLabelRow>
          <div className={c.grid2}>
            <FieldLabelRow label="TURN username">
              <Input
                value={meet.turnUser}
                onChange={(event) =>
                  setMeet((current) => ({ ...current, turnUser: event.target.value }))
                }
              />
            </FieldLabelRow>
            <FieldLabelRow label="TURN password">
              <InstallPasswordInput
                value={meet.turnPwd}
                onChange={(event) =>
                  setMeet((current) => ({ ...current, turnPwd: event.target.value }))
                }
              />
            </FieldLabelRow>
          </div>
        </Card>
      ) : null}
    </>
  );
}
