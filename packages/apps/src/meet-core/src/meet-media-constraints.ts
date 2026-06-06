export function buildMeetAudioConstraints(deviceId?: string): MediaTrackConstraints {
  return {
    echoCancellation: true,
    noiseSuppression: true,
    ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
  };
}

export function buildMeetVideoConstraints(deviceId?: string): MediaTrackConstraints {
  return deviceId
    ? { width: { ideal: 1280 }, height: { ideal: 720 }, deviceId: { exact: deviceId } }
    : { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" };
}
