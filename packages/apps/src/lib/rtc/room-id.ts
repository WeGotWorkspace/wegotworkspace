import type { SignalingChannel } from "@/lib/rtc/types";

/** Encode a virtual file path as a collab room id (`f_{base64url}`). */
export function encodeFileRoomId(path: string): string {
  const bytes = new TextEncoder().encode(path);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  const base64 = btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `f_${base64}`;
}

/** Map logical room + channel to the REST `/rooms/{roomId}` segment. */
export function resolveRoomId(channel: SignalingChannel, room: string): string {
  if (channel === "collab") return encodeFileRoomId(room);
  return room;
}
