import { Label } from "@/ui/label";
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
    <div className="meet-device-row">
      <Label className="field-label-row__label meet-device-row__label">{label}</Label>
      <div className="meet-device-row__control">
        <div className="meet-device-row-icon">{icon}</div>
        <div className="min-w-0 flex-1">
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
        </div>
      </div>
    </div>
  );
}
