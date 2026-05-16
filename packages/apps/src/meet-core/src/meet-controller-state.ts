import type { useMeetController } from "@/meet-core/src/use-meet-controller";

/** Public controller surface consumed by Meet workspace panes. */
export type MeetControllerState = ReturnType<typeof useMeetController>;
