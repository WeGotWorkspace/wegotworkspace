import type { ReactElement } from "react";
import { TooltipProvider } from "@/ui/tooltip";
import "@/meet-core/src/meet-workspace.css";

/** Centered lobby-width surface for pre-call UI. */
export function meetLobbyPaneDecorator(Story: () => ReactElement) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="meet-workspace flex min-h-dvh flex-col" style={{ background: "var(--meet-surface)" }}>
        <main className="meet-workspace__lobby flex-1">
          <Story />
        </main>
      </div>
    </TooltipProvider>
  );
}

/** Full in-call layout shell for room pane and toolbar stories. */
export function meetRoomPaneDecorator(Story: () => ReactElement) {
  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="meet-workspace meet-workspace--in-call flex h-dvh flex-col"
        style={{ background: "var(--meet-surface)" }}
      >
        <Story />
      </div>
    </TooltipProvider>
  );
}

/** Compact centered surface for isolated controls (share, knock badge, device row). */
export function meetComponentPaneDecorator(Story: () => ReactElement) {
  return (
    <TooltipProvider delayDuration={200}>
      <div className="meet-workspace flex min-h-dvh items-center justify-center p-8">
        <Story />
      </div>
    </TooltipProvider>
  );
}

/** Positioned stage for draggable PiP preview. */
export function meetPipStageDecorator(Story: () => ReactElement) {
  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="meet-workspace relative h-[min(70dvh,28rem)] w-full max-w-4xl"
        style={{ background: "var(--meet-surface)" }}
      >
        <Story />
      </div>
    </TooltipProvider>
  );
}

/** Fixed-width chat column matching in-call layout. */
export function meetChatPaneDecorator(Story: () => ReactElement) {
  return (
    <TooltipProvider delayDuration={200}>
      <div
        className="meet-workspace flex h-dvh justify-end p-4"
        style={{ background: "var(--meet-surface)" }}
      >
        <div className="h-full w-full max-w-[340px]">
          <Story />
        </div>
      </div>
    </TooltipProvider>
  );
}
