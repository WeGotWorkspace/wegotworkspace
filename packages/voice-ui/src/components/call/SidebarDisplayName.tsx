import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSettings } from "@/lib/settings";

export function SidebarDisplayName() {
  const { settings, save } = useSettings();

  return (
    <div className="px-7 pb-4 space-y-2 shrink-0">
      <Label htmlFor="sidebar-display-name" className="text-xs font-semibold">
        Your display name
      </Label>
      <Input
        id="sidebar-display-name"
        value={settings.displayName}
        onChange={(e) => save({ ...settings, displayName: e.target.value })}
        placeholder="How others see you in the call"
        className="rounded-2xl h-10 text-sm"
        autoComplete="nickname"
        spellCheck={false}
      />
    </div>
  );
}
