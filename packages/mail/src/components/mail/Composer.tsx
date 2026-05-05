import { useEffect, useState } from "react";
import { Paperclip, X, Send, Save, Trash2 } from "lucide-react";
import { Dialog, DialogContent } from "@wgw/ui";
import { Button } from "@wgw/ui";
import { Input } from "@wgw/ui";
import { Textarea } from "@wgw/ui";
import { mailStore, type Attachment, type Message } from "@/lib/mail-store";
import { toast } from "sonner";

const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

export type DraftSeed = {
  /** Server message id (`folder:uid`) of the draft being edited; removed after send or after saving a replacement draft. */
  sourceMessageId?: string;
  to?: string;
  cc?: string;
  bcc?: string;
  subject?: string;
  body?: string;
};

export function Composer({
  open, onOpenChange, seed, onSend, onSaveDraft, fromIdentity,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  seed?: DraftSeed;
  onSend: (msg: Omit<Message, "id" | "date" | "read" | "starred"> & { id?: string }) => void | Promise<void>;
  onSaveDraft: (msg: Omit<Message, "id" | "date" | "read" | "starred"> & { id?: string }) => void | Promise<void>;
  /** When set (server mail), overrides localStorage From for new messages. */
  fromIdentity?: { displayName: string; email: string };
}) {
  const [to, setTo] = useState("");
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showBcc, setShowBcc] = useState(false);
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [sending, setSending] = useState(false);
  const [savingDraft, setSavingDraft] = useState(false);

  useEffect(() => {
    if (open) {
      setTo(seed?.to ?? "");
      setCc(seed?.cc ?? "");
      setBcc(seed?.bcc ?? "");
      setShowBcc(!!seed?.bcc);
      setSubject(seed?.subject ?? "");
      setBody(seed?.body ?? "");
      setAttachments([]);
    }
  }, [open, seed]);

  const fromName = fromIdentity?.displayName?.trim() || "Sender";
  const fromEmail = fromIdentity?.email?.trim() || "";

  const buildMessage = (
    folderId: string,
  ): Omit<Message, "id" | "date" | "read" | "starred"> & { id?: string } => ({
    ...(seed?.sourceMessageId ? { id: seed.sourceMessageId } : {}),
    folderId,
    from: { name: fromName, email: fromEmail },
    to: to.split(",").map((s) => s.trim()).filter(Boolean).map((email) => ({ email })),
    cc: cc ? cc.split(",").map((s) => s.trim()).filter(Boolean).map((email) => ({ email })) : undefined,
    bcc: bcc ? bcc.split(",").map((s) => s.trim()).filter(Boolean).map((email) => ({ email })) : undefined,
    subject: subject || "(no subject)",
    preview: body.slice(0, 140).replace(/\n/g, " "),
    body,
    attachments,
  });

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target;
    const files = input.files;
    if (!files?.length) return;
    void (async () => {
      const next: Attachment[] = [];
      for (const f of Array.from(files)) {
        if (f.size > MAX_ATTACHMENT_BYTES) {
          toast.error(`${f.name} is too large (max 15 MB per file).`);
          continue;
        }
        try {
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const r = new FileReader();
            r.onload = () => resolve(String(r.result));
            r.onerror = () => reject(new Error("read_failed"));
            r.readAsDataURL(f);
          });
          next.push({
            id: mailStore.newId(),
            name: f.name,
            size: f.size,
            type: f.type || "application/octet-stream",
            dataUrl,
          });
        } catch {
          toast.error(`Could not read ${f.name}`);
        }
      }
      if (next.length) setAttachments((prev) => [...prev, ...next]);
      input.value = "";
    })();
  };

  const send = async () => {
    if (!to.trim()) {
      toast.error("Add at least one recipient");
      return;
    }
    setSending(true);
    try {
      await onSend(buildMessage("sent"));
      toast.success("Message sent");
      onOpenChange(false);
    } catch (err) {
      const m = err instanceof Error ? err.message : "Send failed";
      toast.error(m);
    } finally {
      setSending(false);
    }
  };

  const saveDraft = async () => {
    setSavingDraft(true);
    try {
      await onSaveDraft(buildMessage("drafts"));
      toast("Draft saved");
      onOpenChange(false);
    } catch (err) {
      const m = err instanceof Error ? err.message : "Could not save draft";
      toast.error(m);
    } finally {
      setSavingDraft(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && (sending || savingDraft)) return;
        onOpenChange(v);
      }}
    >
      <DialogContent className="flex h-[80vh] max-w-3xl flex-col gap-0 overflow-hidden p-0">
        <div className="flex items-center justify-between border-b border-border bg-rail px-6 py-3 text-rail-foreground">
          <h2 className="font-display text-lg font-medium">{seed?.sourceMessageId ? "Edit draft" : "New message"}</h2>
          <button
            type="button"
            onClick={() => onOpenChange(false)}
            disabled={sending || savingDraft}
            className="rounded p-1 hover:bg-white/10 disabled:pointer-events-none disabled:opacity-40"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-0 border-b border-border">
          <Field label="To">
            <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="name@example.com" className="h-9 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
          </Field>
          <Field label="Cc">
            <Input value={cc} onChange={(e) => setCc(e.target.value)} placeholder="cc@example.com" className="h-9 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
            {!showBcc && (
              <button
                type="button"
                onClick={() => setShowBcc(true)}
                className="shrink-0 text-xs text-muted-foreground hover:text-foreground"
              >
                Bcc
              </button>
            )}
          </Field>
          {showBcc && (
            <Field label="Bcc">
              <Input value={bcc} onChange={(e) => setBcc(e.target.value)} placeholder="bcc@example.com" className="h-9 min-w-0 flex-1 border-0 bg-transparent px-0 shadow-none focus-visible:ring-0" />
            </Field>
          )}
          <Field label="Subject">
            <Input value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="—" className="h-9 min-w-0 flex-1 border-0 bg-transparent px-0 font-display text-base shadow-none focus-visible:ring-0" />
          </Field>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Write something thoughtful…"
            className="min-h-[300px] resize-none border-0 bg-transparent p-0 text-[15px] leading-relaxed shadow-none focus-visible:ring-0"
          />
        </div>

        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 border-t border-border px-6 py-3">
            {attachments.map((a) => (
              <div key={a.id} className="flex items-center gap-2 rounded-md border border-border bg-secondary/50 px-3 py-1.5 text-xs">
                <Paperclip className="h-3 w-3" />
                <span>{a.name}</span>
                <span className="text-muted-foreground">{(a.size / 1024).toFixed(0)} KB</span>
                <button
                  onClick={() => setAttachments((prev) => prev.filter((x) => x.id !== a.id))}
                  className="ml-1 text-muted-foreground hover:text-destructive"
                  aria-label="Remove"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border bg-card px-4 py-3">
          <div className="flex items-center gap-1">
            <label className="cursor-pointer">
              <input type="file" multiple className="hidden" onChange={handleFile} />
              <span className="inline-flex h-9 items-center gap-1.5 rounded-md px-3 text-sm hover:bg-secondary">
                <Paperclip className="h-4 w-4" /> Attach
              </span>
            </label>
            <Button variant="ghost" size="sm" onClick={() => void saveDraft()} disabled={savingDraft || sending}>
              <Save className="mr-1.5 h-3.5 w-3.5" /> {savingDraft ? "Saving…" : "Draft"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} disabled={sending || savingDraft}>
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Discard
            </Button>
          </div>
          <Button onClick={() => void send()} disabled={sending || savingDraft} className="bg-saffron text-ink hover:bg-saffron/90">
            <Send className="mr-1.5 h-3.5 w-3.5" /> {sending ? "Sending…" : "Send"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-4 border-b border-border px-6 py-1">
      <span className="w-24 shrink-0 text-end text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
        {label}
      </span>
      <div className="flex min-w-0 flex-1 items-center gap-3">{children}</div>
    </div>
  );
}
