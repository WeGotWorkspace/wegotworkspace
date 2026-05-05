import { useState } from "react";
import { Button } from "@wgw/ui";
import {
  CheckCircle2,
  XCircle,
  Loader2,
  RefreshCw,
  ArrowRight,
  ArrowLeft,
  CircleAlert,
} from "lucide-react";
import { cn } from "@wgw/ui";
import type { InstallerCheck } from "../types";

export function ChecksStep({
  checks,
  running,
  onRun,
  onNext,
  onBack,
}: {
  checks: InstallerCheck[];
  running: boolean;
  onRun: () => void;
  onNext: () => void;
  onBack: () => void;
}) {
  const allOk = checks.every((c) => c.ok);
  const anyFail = checks.some((c) => !c.ok);
  const [showChecks, setShowChecks] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">
          Server requirements
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Your server must meet these requirements before you continue.
        </p>
      </div>

      <div className="rounded-xl border bg-card p-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : anyFail ? (
              <CircleAlert className="h-4 w-4 text-destructive" />
            ) : (
              <CheckCircle2 className="h-4 w-4 text-[oklch(0.45_0.15_145)]" />
            )}
            <p>These are technical checks for your server environment.</p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setShowChecks((v) => !v)}
          >
            {showChecks ? "Hide details" : "Show details"}
          </Button>
        </div>

        {showChecks && (
          <div className="mt-4 overflow-hidden rounded-lg border bg-background">
            {checks.map((c, i) => (
              <div
                key={c.label}
                className={cn(
                  "flex items-center gap-4 p-4",
                  i !== checks.length - 1 && "border-b",
                )}
              >
                <div className="flex h-8 w-8 shrink-0 items-center justify-center">
                  {running && (
                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  )}
                  {!running && c.ok && (
                    <CheckCircle2 className="h-6 w-6 text-[oklch(0.65_0.17_145)]" />
                  )}
                  {!running && !c.ok && (
                    <XCircle className="h-6 w-6 text-destructive" />
                  )}
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{c.label}</div>
                  <div className="text-xs text-muted-foreground">
                    {c.detail}
                  </div>
                </div>
                <span
                  className={cn(
                    "rounded-full px-2.5 py-1 text-xs font-semibold",
                    !running &&
                      c.ok &&
                      "bg-[oklch(0.95_0.05_145)] text-[oklch(0.45_0.15_145)]",
                    !running &&
                      !c.ok &&
                      "bg-[var(--brand-red-soft)] text-primary",
                    running && "bg-muted text-muted-foreground",
                  )}
                >
                  {running ? "Checking" : c.ok ? "Pass" : "Fail"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="gap-2">
          <ArrowLeft className="h-4 w-4" /> Back
        </Button>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onRun}
            disabled={running}
            className="gap-2"
          >
            <RefreshCw className={cn("h-4 w-4", running && "animate-spin")} />{" "}
            Re-run
          </Button>
          <Button
            onClick={onNext}
            disabled={!allOk || anyFail || running}
            className="gap-2"
          >
            Continue <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
