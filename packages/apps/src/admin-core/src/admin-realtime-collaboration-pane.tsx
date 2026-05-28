import { useState } from "react";
import { Button } from "@/button/src/button";
import { Card } from "@/card/src/card";
import { FieldLabelRow as FormField } from "@/ui/field-label-row";
import { Input } from "@/ui/input";
import { FeatureRow } from "@/admin-core/src/admin-workspace-widgets";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/ui/alert-dialog";
import type { AdminControllerState } from "@/admin-core/src/use-admin-controller";

export type AdminRealtimeCollaborationPaneProps = {
  controller: AdminControllerState;
};

export function AdminRealtimeCollaborationPane({
  controller,
}: AdminRealtimeCollaborationPaneProps) {
  const [forceRelayConfirmOpen, setForceRelayConfirmOpen] = useState(false);

  const onForceRelayChange = (next: boolean) => {
    if (next && !controller.settingsForm.forceRelay) {
      setForceRelayConfirmOpen(true);
      return;
    }
    controller.setSettingsForm((prev) => ({ ...prev, forceRelay: Boolean(next) }));
  };

  return (
    <>
      <Card title="WebRTC ICE servers">
        <p className="mb-3 text-sm text-muted-foreground">
          ICE servers improve real-time reliability by helping peers discover the best route through
          NATs and firewalls. Configure STUN for direct path discovery and TURN as a relay fallback
          when direct peer-to-peer connections are blocked. Enter multiple URLs as a comma-separated
          list.
        </p>
        <FormField label="STUN URLs">
          <Input
            value={controller.settingsForm.stunUrls}
            onChange={(event) =>
              controller.setSettingsForm((prev) => ({
                ...prev,
                stunUrls: event.currentTarget.value,
              }))
            }
          />
        </FormField>
        <FormField label="TURN URLs">
          <Input
            value={controller.settingsForm.turnUrls}
            onChange={(event) =>
              controller.setSettingsForm((prev) => ({
                ...prev,
                turnUrls: event.currentTarget.value,
              }))
            }
          />
        </FormField>
        <div className="grid md:grid-cols-2 gap-3">
          <FormField label="TURN username">
            <Input
              value={controller.settingsForm.turnUsername}
              onChange={(event) =>
                controller.setSettingsForm((prev) => ({
                  ...prev,
                  turnUsername: event.currentTarget.value,
                }))
              }
            />
          </FormField>
          <FormField label="TURN password">
            <Input
              type="password"
              value={controller.settingsForm.turnPassword}
              onChange={(event) =>
                controller.setSettingsForm((prev) => ({
                  ...prev,
                  turnPassword: event.currentTarget.value,
                }))
              }
            />
          </FormField>
        </div>
      </Card>

      <Card title="Routing policy">
        <FeatureRow
          label="Force TURN relay for all real-time sessions"
          desc="Routes every session through TURN. Off by default."
          value={controller.settingsForm.forceRelay}
          onChange={onForceRelayChange}
        />
      </Card>
      <div className="flex justify-end">
        <Button label="Save changes" variant="primary" onClick={controller.actions.saveSettings} />
      </div>

      <AlertDialog open={forceRelayConfirmOpen} onOpenChange={setForceRelayConfirmOpen}>
        <AlertDialogContent className="admin-dialog-surface">
          <AlertDialogHeader>
            <AlertDialogTitle>Force TURN relay for all real-time sessions?</AlertDialogTitle>
            <AlertDialogDescription>
              When enabled, every collaboration session is sent through your TURN server. This
              increases bandwidth use and can add latency, but helps clients behind strict
              firewalls. You still need to save changes for this to take effect on the server.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                controller.setSettingsForm((prev) => ({ ...prev, forceRelay: true }));
                setForceRelayConfirmOpen(false);
              }}
            >
              Turn on relay
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
