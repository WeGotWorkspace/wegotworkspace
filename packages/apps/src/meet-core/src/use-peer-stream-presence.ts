import { useCallback, useEffect, useState } from "react";

/** Subscribe to remote MediaStream track mute/ended so peer tiles match camera + mic reality. */
export function usePeerStreamPresence(stream: MediaStream | null) {
  const [, bump] = useState(0);
  const onChange = useCallback(() => {
    bump((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!stream) return;

    const attach = (track: MediaStreamTrack) => {
      track.addEventListener("mute", onChange);
      track.addEventListener("unmute", onChange);
      track.addEventListener("ended", onChange);
    };

    const detach = (track: MediaStreamTrack) => {
      track.removeEventListener("mute", onChange);
      track.removeEventListener("unmute", onChange);
      track.removeEventListener("ended", onChange);
    };

    stream.getTracks().forEach(attach);

    const onAddTrack = (event: MediaStreamTrackEvent) => {
      attach(event.track);
      onChange();
    };

    const onRemoveTrack = (event: MediaStreamTrackEvent) => {
      detach(event.track);
      onChange();
    };

    stream.addEventListener("addtrack", onAddTrack);
    stream.addEventListener("removetrack", onRemoveTrack);

    return () => {
      stream.getTracks().forEach(detach);
      stream.removeEventListener("addtrack", onAddTrack);
      stream.removeEventListener("removetrack", onRemoveTrack);
    };
  }, [stream, onChange]);

  usePollStreamTrackSignals(stream, onChange);

  const videoTrack = stream?.getVideoTracks()[0] ?? null;
  const audioTrack = stream?.getAudioTracks()[0] ?? null;

  const cameraRendering =
    !!videoTrack && videoTrack.readyState === "live" && !videoTrack.muted && videoTrack.enabled;

  const micLive = !!audioTrack && audioTrack.readyState === "live" && !audioTrack.muted;

  return { cameraRendering, micLive };
}

function usePollStreamTrackSignals(stream: MediaStream | null, bump: () => void) {
  useEffect(() => {
    if (!stream) return;
    const id = window.setInterval(() => {
      bump();
    }, 600);
    return () => window.clearInterval(id);
  }, [stream, bump]);
}
