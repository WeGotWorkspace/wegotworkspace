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
    <div className="flex items-center gap-3">
      <div className="meet-device-row-icon">{icon}</div>
      <div className="min-w-0 flex-1">
        <Label className="meet-device-row-label">{label}</Label>
        <Select value={value} onValueChange={onChange}>
          <SelectTrigger className="meet-device-row-trigger">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {options.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {option.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
