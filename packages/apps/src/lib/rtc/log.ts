import type { SignalingChannel } from "@/lib/rtc/types";
import { isRtcDebugEnabled } from "@/lib/rtc/debug";

export type RtcLogContext = {
  channel: SignalingChannel;
  peerId?: string | null;
};

export function rtcLog(context: RtcLogContext, event: string, details?: unknown): void {
  if (!isRtcDebugEnabled()) return;
  const peer = context.peerId ? `[${context.peerId}]` : "";
  const prefix = `[rtc][${context.channel}]${peer}[${event}]`;
  if (details === undefined) {
    console.info(prefix);
    return;
  }
  console.info(prefix, details);
}
