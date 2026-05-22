import { Eye, EyeOff } from "lucide-react";
import { useState } from "react";
import { BooleanSegmentedControl } from "@/segmented-control/src/segmented-control";
import { Input } from "@/ui/input";
import { installWorkspacePaneClasses as c } from "@/install-core/src/install-workspace.styles";

export function InstallFeatureRow({
  label,
  desc,
  value,
  onChange,
}: {
  label: string;
  desc: string;
  value: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <div className={c.featureRow}>
      <div className="min-w-0">
        <div className={c.featureRowTitle}>{label}</div>
        <div className={c.featureRowDesc}>{desc}</div>
      </div>
      <BooleanSegmentedControl value={value} onChange={onChange} aria-label={`${label} enabled`} />
    </div>
  );
}

export function InstallPasswordInput({
  value,
  onChange,
  placeholder = "********",
}: {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder?: string;
}) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        type={visible ? "text" : "password"}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        className="pr-10"
      />
      <button
        type="button"
        onClick={() => setVisible((current) => !current)}
        className="install-password-toggle"
        aria-label={visible ? "Hide password" : "Show password"}
      >
        {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
      </button>
    </div>
  );
}
