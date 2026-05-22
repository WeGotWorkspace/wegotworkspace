import { FieldLabelRow } from "@/ui/field-label-row";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import type { MeetDeviceOption } from "@/meet-core/src/meet-device-utils";

type MeetDeviceRowProps = {
  icon: React.ReactNode;
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: MeetDeviceOption[];
};

export function MeetDeviceRow({ icon, label, value, onChange, options }: MeetDeviceRowProps) {
  return (
    <div className="meet-device-row flex items-center gap-3">
      <div className="meet-device-row-icon">{icon}</div>
      <FieldLabelRow label={label} className="mb-0 min-w-0 flex-1">
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="meet-device-row__trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="meet-popover-surface">
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FieldLabelRow>
    </div>
  );
}
