import { CircleAlert, CircleCheck, CircleDashed } from "lucide-react";
import type { InstallCheckStatus } from "@/install-core/src/install-types";

export function InstallStatusDot({ status }: { status: InstallCheckStatus }) {
  const map: Record<InstallCheckStatus, { color: string; Icon: typeof CircleCheck }> = {
    ok: { color: "var(--install-status-ok)", Icon: CircleCheck },
    warn: { color: "var(--install-status-warn)", Icon: CircleAlert },
    error: { color: "var(--install-status-error)", Icon: CircleAlert },
    pending: { color: "var(--install-status-pending)", Icon: CircleDashed },
  };
  const { color, Icon } = map[status];
  return <Icon className="size-4 shrink-0" style={{ color }} aria-hidden />;
}
