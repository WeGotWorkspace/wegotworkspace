import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Card } from "@/card/src/card";
import { FieldLabelRow } from "@/ui/field-label-row";
import { INSTALL_TIMEZONES } from "@/install-core/src/install-models";
import type { InstallControllerState } from "@/install-core/src/use-install-controller";
import { InstallFeatureRow } from "@/install-core/src/install-workspace-widgets";

export function InstallDavPane({
  controller,
}: {
  controller: Pick<InstallControllerState, "dav" | "setDav" | "meet" | "setMeet">;
}) {
  const { dav, setDav, meet, setMeet } = controller;

  return (
    <>
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
      <Card title="Regional">
        <FieldLabelRow label="Default timezone">
          <Select
            value={meet.tz}
            onValueChange={(value) => setMeet((current) => ({ ...current, tz: value }))}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="max-h-72">
              {INSTALL_TIMEZONES.map((timezone) => (
                <SelectItem key={timezone} value={timezone}>
                  {timezone}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </FieldLabelRow>
      </Card>
    </>
  );
}
