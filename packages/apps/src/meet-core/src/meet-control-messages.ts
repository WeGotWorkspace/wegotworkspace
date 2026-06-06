export type MeetControlMessage =
  | { kind: "knock"; peerId: string; name: string }
  | { kind: "admit"; peerId: string }
  | { kind: "deny"; peerId: string }
  | { kind: "end"; by: string }
  | { kind: "media"; mic: boolean; camera: boolean; screen?: boolean };

export const MEET_KNOCK_NAME_PREFIX = "__wgw_knock__:";
const MEET_CONTROL_PREFIX = "__wgw_meet_control__:";

export function encodeMeetKnockerName(displayName: string): string {
  const safeName = displayName.trim() || "Guest";
  return `${MEET_KNOCK_NAME_PREFIX}${safeName}`;
}

export function decodeMeetKnockerName(peerName: string): string | null {
  if (!peerName.startsWith(MEET_KNOCK_NAME_PREFIX)) return null;
  const name = peerName.slice(MEET_KNOCK_NAME_PREFIX.length).trim();
  return name === "" ? "Guest" : name;
}

export function buildMeetControlMessage(payload: MeetControlMessage): string {
  return `${MEET_CONTROL_PREFIX}${JSON.stringify(payload)}`;
}

export function parseMeetControlMessage(text: string): MeetControlMessage | null {
  if (!text.startsWith(MEET_CONTROL_PREFIX)) return null;
  try {
    const parsed = JSON.parse(text.slice(MEET_CONTROL_PREFIX.length)) as Record<string, unknown>;
    if (
      parsed.kind === "knock" &&
      typeof parsed.peerId === "string" &&
      typeof parsed.name === "string"
    ) {
      return { kind: "knock", peerId: parsed.peerId, name: parsed.name };
    }
    if ((parsed.kind === "admit" || parsed.kind === "deny") && typeof parsed.peerId === "string") {
      return { kind: parsed.kind, peerId: parsed.peerId };
    }
    if (parsed.kind === "end" && typeof parsed.by === "string") {
      return { kind: "end", by: parsed.by };
    }
    if (
      parsed.kind === "media" &&
      typeof parsed.mic === "boolean" &&
      typeof parsed.camera === "boolean"
    ) {
      return {
        kind: "media",
        mic: parsed.mic,
        camera: parsed.camera,
        ...(typeof parsed.screen === "boolean" ? { screen: parsed.screen } : {}),
      };
    }
  } catch {
    return null;
  }
  return null;
}
