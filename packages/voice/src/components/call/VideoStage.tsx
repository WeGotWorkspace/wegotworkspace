import { useEffect, useRef } from "react";
import { CallTimer } from "./CallTimer";
import type { CallStatus, RemotePeer } from "@/hooks/use-mesh";
import { Loader2, MicOff, User } from "lucide-react";
import { cn } from "@wgw/ui";

interface Props {
  status: CallStatus;
  startedAt: number | null;
  camOn: boolean;
  micOn: boolean;
  peers: RemotePeer[];
  localVideoRef: React.RefObject<HTMLVideoElement | null>;
}

const STATUS_LABEL: Record<CallStatus, string> = {
  idle: "Ready",
  preparing: "Joining room…",
  "in-call": "Live",
  failed: "Connection failed",
};

function RemoteTile({ peer }: { peer: RemotePeer }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    if (ref.current && peer.stream) ref.current.srcObject = peer.stream;
  }, [peer.stream]);

  const connecting =
    peer.connectionState === "new" ||
    peer.connectionState === "connecting" ||
    !peer.stream?.getVideoTracks().some((t) => t.readyState === "live");

  return (
    <div className="relative w-full h-full bg-foreground/5 squircle overflow-hidden border border-border/40 soft-shadow">
      <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />
      {connecting && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-muted/80 backdrop-blur-sm">
          <div className="size-14 rounded-full bg-card flex items-center justify-center soft-shadow">
            <User className="size-6 text-muted-foreground" />
          </div>
          <Loader2 className="size-4 text-primary animate-spin" />
          <span className="text-xs font-semibold text-muted-foreground">{peer.name}</span>
        </div>
      )}
      <div className="absolute bottom-3 left-4 px-3 py-1.5 rounded-full bg-card/80 backdrop-blur-md border border-border/60 text-xs font-semibold tracking-tight">
        {peer.name}
      </div>
    </div>
  );
}

function gridClass(count: number): string {
  if (count <= 1) return "grid-cols-1 grid-rows-1";
  if (count === 2) return "grid-cols-2 grid-rows-1";
  if (count === 3) return "grid-cols-2 grid-rows-2";
  return "grid-cols-2 grid-rows-2";
}

export function VideoStage({
  status,
  startedAt,
  camOn,
  micOn,
  peers,
  localVideoRef,
}: Props) {
  const isLive = status === "in-call";
  const isWorking = status === "preparing";
  const hasRemotes = peers.length > 0;

  return (
    <div className="relative flex-1 w-full bg-muted/40 squircle overflow-hidden soft-shadow-lg border border-border/40">
      {/* Empty / waiting state */}
      {(!isLive || !hasRemotes) && (
        <div className="absolute inset-0 flex items-center justify-center bg-linear-to-br from-muted/80 via-background/50 to-accent-soft">
          <div className="text-center max-w-sm px-8">
            {isWorking ? (
              <Loader2 className="size-8 mx-auto mb-4 text-primary animate-spin" />
            ) : (
              <div className="size-16 mx-auto mb-5 rounded-full bg-card soft-shadow flex items-center justify-center">
                <div
                  className={cn(
                    "size-3 rounded-full",
                    status === "failed"
                      ? "bg-destructive"
                      : isLive
                        ? "bg-primary animate-pulse"
                        : "bg-muted-foreground/40",
                  )}
                />
              </div>
            )}
            <h2 className="text-xl font-semibold tracking-tight text-balance">
              {status === "failed"
                ? "We couldn't connect"
                : isLive
                  ? "Waiting for others to join…"
                  : "Your call will appear here"}
            </h2>
            <p className="text-sm text-muted-foreground mt-2 leading-relaxed">
              {isLive
                ? "Share your room code from the panel on the left."
                : "Use the panel on the left to start a new call or join one."}
            </p>
          </div>
        </div>
      )}

      {/* Remote video grid */}
      {isLive && hasRemotes && (
        <div className={cn("absolute inset-0 grid gap-3 p-3", gridClass(peers.length))}>
          {peers.map((p) => (
            <RemoteTile key={p.id} peer={p} />
          ))}
        </div>
      )}

      {/* Status pill */}
      <div className="absolute top-6 left-6 flex items-center gap-2 px-3.5 py-2 rounded-full bg-card/80 backdrop-blur-md border border-border/60 soft-shadow z-10">
        <span
          className={cn(
            "size-2 rounded-full",
            isLive
              ? "bg-primary animate-pulse"
              : status === "failed"
                ? "bg-destructive"
                : "bg-muted-foreground/50",
          )}
        />
        <span className="text-xs font-semibold tracking-tight">{STATUS_LABEL[status]}</span>
        {isLive && (
          <>
            <span className="w-px h-3 bg-border" />
            <CallTimer startedAt={startedAt} />
          </>
        )}
        {isLive && peers.length > 0 && (
          <>
            <span className="w-px h-3 bg-border" />
            <span className="text-xs font-mono tabular-nums text-muted-foreground">
              {peers.length + 1}/4
            </span>
          </>
        )}
      </div>

      {/* Local PiP */}
      <div className="absolute top-6 right-6 w-56 aspect-video rounded-[1.75rem] overflow-hidden border-4 border-card/80 ring-1 ring-border/40 soft-shadow-lg bg-foreground/5 z-10">
        <video
          ref={localVideoRef}
          autoPlay
          playsInline
          muted
          className={cn("w-full h-full object-cover", camOn ? "" : "opacity-0")}
        />
        {!camOn && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted">
            <span className="text-[10px] font-bold tracking-widest text-muted-foreground uppercase">
              Camera off
            </span>
          </div>
        )}
        <div className="absolute bottom-2 left-3 flex items-center gap-1.5 text-[10px] font-bold text-white uppercase tracking-widest drop-shadow">
          {micOn ? (
            <span className="size-1.5 rounded-full bg-primary" />
          ) : (
            <MicOff className="size-2.5 text-destructive" />
          )}
          You
        </div>
      </div>

      {/* Soft light leaks */}
      <div className="absolute -top-32 -right-32 size-80 bg-primary/15 blur-[100px] rounded-full pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 size-80 bg-destructive/10 blur-[100px] rounded-full pointer-events-none" />
    </div>
  );
}
