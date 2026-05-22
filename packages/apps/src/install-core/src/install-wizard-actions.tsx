import { Check, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Button } from "@/button/src/button";
import type { InstallControllerState } from "@/install-core/src/use-install-controller";
import { installWorkspacePaneClasses as c } from "@/install-core/src/install-workspace.styles";

export function InstallWizardActions({
  controller,
}: {
  controller: Pick<
    InstallControllerState,
    | "step"
    | "stepIdx"
    | "goBack"
    | "goNext"
    | "canNext"
    | "actionPending"
    | "mysqlTest"
    | "setUiStep"
  >;
}) {
  const { step, stepIdx, goBack, goNext, canNext, actionPending, mysqlTest, setUiStep } =
    controller;

  if (step.id === "done") return null;

  return (
    <div className={c.wizardActions}>
      <Button variant="ghost" onClick={goBack} disabled={stepIdx === 0 || actionPending}>
        <ChevronLeft className="size-4 mr-1" />
        Back
      </Button>
      <div className="flex items-center gap-2">
        {step.id === "mail" || step.id === "meet" ? (
          <Button
            variant="ghost"
            onClick={() => setUiStep(step.id === "mail" ? "meet" : "admin")}
            disabled={actionPending}
            className="text-[color:var(--install-muted-fg)]"
          >
            Skip for now
          </Button>
        ) : null}
        <Button
          variant="primary"
          onClick={() => void goNext()}
          disabled={!canNext || actionPending || mysqlTest.state === "testing"}
        >
          {actionPending || mysqlTest.state === "testing" ? (
            <>
              <Loader2 className="size-4 mr-2 animate-spin" />
              Working...
            </>
          ) : step.id === "admin" ? (
            <>
              Finish install
              <Check className="size-4 ml-1" />
            </>
          ) : (
            <>
              Continue
              <ChevronRight className="size-4 ml-1" />
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
