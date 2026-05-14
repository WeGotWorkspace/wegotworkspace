import { ArrowLeft } from "lucide-react";
import { IconButton } from "@/button/src/button";
import { cn } from "@/lib/utils";
import "@/action-bar/src/action-bar.css";

export type ActionBarProps = {
  /** Shown only below the `md` breakpoint; typically closes the mobile detail stack. */
  onBack?: () => void;
  backLabel?: string;
  /** Primary actions (e.g. reply), placed after the back control on small screens. */
  left?: React.ReactNode;
  /** Secondary actions (e.g. archive), aligned to the trailing edge. */
  right?: React.ReactNode;
  className?: string;
};

export function ActionBar({ onBack, backLabel = "Back", left, right, className }: ActionBarProps) {
  return (
    <nav className={cn("action-bar", className)}>
      {onBack ? (
        <IconButton
          label={backLabel}
          onClick={onBack}
          icon={<ArrowLeft />}
          variant="ghost"
          className="action-bar__back"
        />
      ) : null}
      {left != null ? <div className="action-bar__left">{left}</div> : null}
      <div className="action-bar__spacer" />
      {right != null ? <div className="action-bar__right">{right}</div> : null}
    </nav>
  );
}
