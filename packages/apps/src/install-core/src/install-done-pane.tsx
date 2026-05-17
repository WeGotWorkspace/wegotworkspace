import { ChevronRight, PartyPopper } from "lucide-react";
import { Button } from "@/button/src/button";
import { Card } from "@/card/src/card";
import { installWorkspacePaneClasses as c } from "@/install-core/src/install-workspace.styles";

export function InstallDonePane({ onOpenAdmin }: { onOpenAdmin?: () => void }) {
  return (
    <Card>
      <div className={c.doneHero}>
        <div className={c.doneHeroIconWrap}>
          <PartyPopper className="size-8" style={{ color: "var(--install-status-ok)" }} />
        </div>
        <h2 className={c.doneHeroTitle}>You&apos;re all set</h2>
        <p className={c.doneHeroSubtitle}>
          Your server has been configured. Continue to the admin panel.
        </p>
        <Button variant="primary" onClick={onOpenAdmin}>
          Open admin panel
          <ChevronRight className="size-4 ml-1" />
        </Button>
      </div>
    </Card>
  );
}
