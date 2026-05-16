import { Card } from "@/card/src/card";
import type { InstallControllerState } from "@/install-core/src/use-install-controller";
import { InstallFeatureRow } from "@/install-core/src/install-workspace-widgets";

export function InstallDavPane({
  controller,
}: {
  controller: Pick<InstallControllerState, "dav" | "setDav">;
}) {
  const { dav, setDav } = controller;

  return (
    <Card title="Files, Contacts & Calendars">
      <InstallFeatureRow
        label="Files"
        desc="Sync user files across devices."
        value={dav.files}
        onChange={(value) => setDav((current) => ({ ...current, files: value }))}
      />
      <InstallFeatureRow
        label="Contacts"
        desc="Sync address books across devices."
        value={dav.contacts}
        onChange={(value) => setDav((current) => ({ ...current, contacts: value }))}
      />
      <InstallFeatureRow
        label="Calendars"
        desc="Sync calendars and tasks across devices."
        value={dav.calendars}
        onChange={(value) => setDav((current) => ({ ...current, calendars: value }))}
      />
    </Card>
  );
}
