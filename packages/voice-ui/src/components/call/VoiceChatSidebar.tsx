import { Fragment, useEffect, useRef, useState, type ReactNode } from "react";
import type { VoiceChatLine } from "@/hooks/use-mesh";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { MessageSquare, Send } from "lucide-react";

/** Strip common trailing punctuation mistaken for part of the URL. */
function trimUrlCandidate(raw: string): string {
  let t = raw;
  while (t.length > 0 && /[.,;:!?)\]'"»]+$/u.test(t)) {
    t = t.slice(0, -1);
  }
  return t;
}

function safeHttpHref(candidate: string): string | null {
  try {
    const u = new URL(candidate);
    if (u.protocol === "http:" || u.protocol === "https:") return u.href;
  } catch {
    /* invalid */
  }
  return null;
}

/** Renders plain text with http(s) links as anchors (no HTML injection). */
function linkifyMessage(text: string): ReactNode {
  if (text === "") return null;
  const re = /https?:\/\/[^\s]+/gi;
  const nodes: ReactNode[] = [];
  let last = 0;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const start = m.index;
    const full = m[0];
    if (start > last) nodes.push(text.slice(last, start));
    const candidate = trimUrlCandidate(full);
    const suffix = full.slice(candidate.length);
    const href = safeHttpHref(candidate);
    if (href) {
      nodes.push(
        <a
          key={`${start}-${candidate.slice(0, 24)}`}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-primary font-medium underline underline-offset-2 wrap-break-word hover:opacity-90"
        >
          {candidate}
        </a>,
      );
    } else {
      nodes.push(full);
    }
    if (suffix) nodes.push(suffix);
    last = start + full.length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  if (nodes.length === 0) return null;
  return nodes.length === 1 ? nodes[0] : <Fragment>{nodes}</Fragment>;
}

interface Props {
  inCall: boolean;
  messages: VoiceChatLine[];
  onSend: (text: string) => void | Promise<void>;
}

function formatTime(at: number): string {
  try {
    return new Date(at).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

export function VoiceChatSidebar({ inCall, messages, onSend }: Props) {
  const [draft, setDraft] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  const submit = () => {
    const t = draft.trim();
    if (!t || !inCall) return;
    setDraft("");
    void onSend(t);
  };

  return (
    <aside
      className={cn(
        "w-[min(100vw,300px)] sm:w-[300px] shrink-0 border-l border-border",
        "flex flex-col bg-card/50 backdrop-blur-sm min-h-0 self-stretch",
      )}
    >
      <div className="p-4 border-b border-border/80 flex items-center gap-2 shrink-0">
        <div className="size-8 rounded-xl bg-primary/15 flex items-center justify-center">
          <MessageSquare className="size-4 text-primary" />
        </div>
        <div>
          <div className="text-sm font-bold tracking-tight leading-none">Room chat</div>
          <div className="text-[10px] text-muted-foreground mt-1 leading-snug">
            {inCall ? "Signaling relay · not end-to-end" : "Join a call to send"}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-3">
        {!inCall && messages.length === 0 && (
          <p className="text-[11px] text-muted-foreground leading-relaxed px-1">
            Messages are cleared when you leave. Voice and video stay peer-to-peer.
          </p>
        )}
        {messages.map((m) => (
          <div
            key={m.key}
            className={cn(
              "rounded-2xl px-3 py-2.5 text-xs leading-relaxed border",
              m.isSelf
                ? "ml-4 bg-primary/12 border-primary/20 text-foreground"
                : "mr-4 bg-muted/50 border-border/60 text-foreground",
            )}
          >
            <div className="flex items-baseline justify-between gap-2 mb-1">
              <span
                className={cn("font-bold truncate", m.isSelf ? "text-primary" : "text-foreground")}
              >
                {m.isSelf ? "You" : m.fromName}
              </span>
              <span className="text-[10px] text-muted-foreground shrink-0 tabular-nums">
                {formatTime(m.at)}
              </span>
            </div>
            <p className="whitespace-pre-wrap wrap-break-word text-[13px] leading-snug">
              {linkifyMessage(m.text)}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <div className="p-3 border-t border-border/80 shrink-0 space-y-2">
        <div className="flex gap-2">
          <Input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                submit();
              }
            }}
            placeholder={inCall ? "Message the room…" : "Join to chat"}
            disabled={!inCall}
            className="rounded-2xl h-10 text-sm min-w-0"
            maxLength={2000}
            autoComplete="off"
            spellCheck={true}
          />
          <Button
            type="button"
            size="icon"
            className="rounded-2xl size-10 shrink-0"
            disabled={!inCall || !draft.trim()}
            onClick={submit}
            title="Send"
          >
            <Send className="size-4" />
          </Button>
        </div>
      </div>
    </aside>
  );
}
