import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, LogIn, Copy, Check } from "lucide-react";
import { buildGuestJoinUrl, parseJoinInputToRoomCode } from "@/lib/sabreJoinUrl";
import { randomRoom } from "@/lib/webrtc";
import { toast } from "sonner";
import { useSettings } from "@/lib/settings";

interface Props {
  status: string;
  roomCode: string | null;
  onJoin: (room: string) => Promise<void>;
  onLeave: () => Promise<void>;
  /** When false (guest), only joining with a room code is allowed; starting a new room requires Sabre sign-in. */
  canCreateRoom?: boolean;
}

export function RoomPanel({
  status,
  roomCode,
  onJoin,
  onLeave,
  canCreateRoom = true,
}: Props) {
  const { settings } = useSettings();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  const inCall = status === "in-call" || status === "preparing";

  const ensureReady = (): boolean => {
    if (!settings.signalingUrl.trim()) {
      toast.error(
        "No signaling URL is available. Ask your administrator to set Aura Voice signaling (or the override) under Admin → Settings."
      );
      return false;
    }
    return true;
  };

  const handleCreate = async () => {
    if (!canCreateRoom) {
      toast.error("Sign in with your Sabre account to start a new call (e.g. open Drive once with the same login).");
      return;
    }
    if (!ensureReady()) return;
    const room = randomRoom();
    setBusy(true);
    try {
      await onJoin(room);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create room");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async () => {
    if (!ensureReady()) return;
    const r = parseJoinInputToRoomCode(code);
    if (!r) return;
    setBusy(true);
    try {
      await onJoin(r);
      setCode("");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to join room");
    } finally {
      setBusy(false);
    }
  };

  const handleLeave = async () => {
    setBusy(true);
    try {
      await onLeave();
    } finally {
      setBusy(false);
    }
  };

  const copyGuestJoinUrl = async (url: string) => {
    if (!url) return;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success("Join link copied");
    setTimeout(() => setCopied(false), 1600);
  };

  if (inCall && roomCode) {
    const guestJoinUrl = buildGuestJoinUrl(roomCode);
    return (
      <div className="space-y-5">
        <div className="space-y-2">
          <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-bold">
            Active room
          </div>
          <Label htmlFor="guest-join-url" className="text-xs font-semibold">
            Guest join link
          </Label>
          <div className="flex gap-2">
            <Input
              id="guest-join-url"
              readOnly
              value={guestJoinUrl}
              onFocus={(e) => e.target.select()}
              className="rounded-2xl h-11 min-w-0 font-mono text-[11px] bg-accent-soft/40 border-primary/15"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="shrink-0 rounded-2xl size-11 border-primary/20"
              title="Copy join link"
              onClick={() => void copyGuestJoinUrl(guestJoinUrl)}
            >
              {copied ? (
                <Check className="size-4 text-primary" />
              ) : (
                <Copy className="size-4" />
              )}
            </Button>
          </div>
          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Share this URL. Guests open it without logging in (up to 3 others).
          </p>
        </div>

        <Button
          onClick={handleLeave}
          disabled={busy}
          variant="outline"
          className="w-full rounded-2xl h-11 font-semibold border-destructive/30 text-destructive hover:bg-destructive hover:text-destructive-foreground"
        >
          Leave room
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Button
          onClick={handleCreate}
          disabled={busy || !canCreateRoom}
          className="w-full rounded-2xl h-12 font-semibold text-sm"
        >
          <Sparkles className="size-4 mr-2" />
          Start a new call
        </Button>
        <p className="text-[11px] text-muted-foreground text-center leading-relaxed">
          {canCreateRoom
            ? "Generates a private room code you can share."
            : "Sign in via this site (same account as WebDAV) to start a call. Anyone with a code can join without signing in."}
        </p>
      </div>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center">
          <span className="bg-sidebar px-3 text-[10px] uppercase tracking-[0.25em] text-muted-foreground font-bold">
            or
          </span>
        </div>
      </div>

      <div className="space-y-3">
        <Label htmlFor="roomcode" className="text-xs font-semibold">
          Join with a room code or link
        </Label>
        <Input
          id="roomcode"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleJoin()}
          placeholder="ABCD-EFGH-JKLM or paste join URL"
          className="rounded-2xl h-11 font-mono text-xs text-center"
          autoComplete="off"
          spellCheck={false}
        />
        <Button
          onClick={handleJoin}
          disabled={busy || !code.trim()}
          variant="outline"
          className="w-full rounded-2xl h-11 font-semibold"
        >
          <LogIn className="size-4 mr-2" />
          Join call
        </Button>
      </div>
    </div>
  );
}
