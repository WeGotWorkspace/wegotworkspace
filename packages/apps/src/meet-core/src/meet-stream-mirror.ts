/** True when the track is from getDisplayMedia (local or detectable on the receiver). */
export function isDisplayCaptureVideoTrack(track: MediaStreamTrack | null | undefined): boolean {
  if (!track || track.kind !== "video") return false;

  const settings = track.getSettings?.() as MediaTrackSettings & {
    displaySurface?: string;
  };
  if (settings?.displaySurface) return true;

  const label = track.label.toLowerCase();
  return (
    label.includes("screen") ||
    label.includes("window") ||
    label.includes("display") ||
    label.includes("desktop")
  );
}

export function isDisplayCaptureStream(stream: MediaStream | null | undefined): boolean {
  return isDisplayCaptureVideoTrack(stream?.getVideoTracks()[0]);
}

/**
 * Local self-preview and remote peer camera tiles use mirror; screen share never does.
 * Prefer disclosed `screen` from control chat when present (reliable across peers).
 */
export function shouldMirrorMeetStream(
  stream: MediaStream | null | undefined,
  disclosedScreen?: boolean | null,
): boolean {
  if (!stream) return false;
  if (disclosedScreen === true) return false;
  if (isDisplayCaptureStream(stream)) return false;
  return true;
}
