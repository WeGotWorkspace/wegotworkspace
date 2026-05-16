import { useEffect, useRef } from "react";

type MeetStreamVideoProps = {
  stream: MediaStream | null;
  className?: string;
  mirrored?: boolean;
};

export function MeetStreamVideo({ stream, className, mirrored }: MeetStreamVideoProps) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node || !stream) return;
    node.srcObject = stream;
    return () => {
      node.srcObject = null;
    };
  }, [stream]);

  if (!stream) return null;

  return (
    <video
      ref={ref}
      autoPlay
      playsInline
      className={className}
      style={mirrored ? { transform: "scaleX(-1)" } : undefined}
    />
  );
}
