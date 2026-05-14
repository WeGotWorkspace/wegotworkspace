import { CalendarDays, Mailbox } from "lucide-react";
import { DetailViewHeader } from "@/detail-view-header/src/detail-view-header";
import { Button } from "@/app-button/src/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { cn } from "@/lib/utils";

type MailComposeViewProps = {
  mailId: string;
  mailbox: string;
  date: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  onToChange: (value: string) => void;
  onCcChange: (value: string) => void;
  onBccChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onSaveDraft: () => void;
  onSend: () => void;
  onDiscard: () => void;
  saving: boolean;
  sending: boolean;
  className?: string;
};

function ComposeField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
}) {
  return (
    <label className="flex items-center gap-3 text-sm">
      <span className="w-11 shrink-0 text-[color-mix(in_oklab,var(--color-ink)_58%,transparent)]">
        {label}
      </span>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="border-0 border-b rounded-none px-0 h-10 shadow-none focus-visible:ring-0 focus-visible:border-b"
      />
    </label>
  );
}

export function MailComposeView({
  mailId,
  mailbox,
  date,
  to,
  cc,
  bcc,
  subject,
  body,
  onToChange,
  onCcChange,
  onBccChange,
  onSubjectChange,
  onBodyChange,
  onSaveDraft,
  onSend,
  onDiscard,
  saving,
  sending,
  className,
}: MailComposeViewProps) {
  const disableActions = saving || sending;

  return (
    <article className={cn("max-w-[760px] mx-auto", className)}>
      <DetailViewHeader
        topTags={[
          {
            key: "mailbox",
            label: mailbox,
            icon: <Mailbox className="size-3.5 opacity-70" />,
            colors: {
              color: "var(--color-cream, #f5f1e8)",
              backgroundColor: "color-mix(in oklab, var(--color-ink) 88%, transparent)",
            },
          },
          {
            key: "date",
            label: date,
            icon: <CalendarDays className="size-3.5 opacity-70" />,
            colors: {
              backgroundColor: "color-mix(in oklab, var(--color-ink) 6%, transparent)",
              color: "color-mix(in oklab, var(--color-ink) 58%, transparent)",
            },
          },
        ]}
        title={subject}
        editable
        onTitleChange={onSubjectChange}
        titleKey={`${mailId}-compose-subject`}
        titleClassName="text-3xl md:text-4xl font-sans text-(--color-ink) font-semibold leading-[1.1] tracking-tight mb-6"
        titlePlaceholder="Subject"
      />

      <div className="rounded-xl border border-[color-mix(in_oklab,var(--color-ink)_12%,transparent)] bg-[color-mix(in_oklab,var(--color-cream)_86%,white)] p-4 md:p-5 space-y-3">
        <ComposeField
          label="To"
          value={to}
          onChange={onToChange}
          placeholder="alice@example.com, bob@example.com"
        />
        <ComposeField label="Cc" value={cc} onChange={onCcChange} placeholder="Optional" />
        <ComposeField label="Bcc" value={bcc} onChange={onBccChange} placeholder="Optional" />

        <label className="block pt-2">
          <span className="sr-only">Message body</span>
          <Textarea
            value={body}
            onChange={(event) => onBodyChange(event.target.value)}
            placeholder="Write your message..."
            className="min-h-[320px] md:min-h-[400px] resize-y border-[color-mix(in_oklab,var(--color-ink)_15%,transparent)]"
          />
        </label>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="ghost" onClick={onDiscard} disabled={disableActions}>
            Discard
          </Button>
          <Button type="button" variant="outline" onClick={onSaveDraft} disabled={disableActions}>
            {saving ? "Saving..." : "Save draft"}
          </Button>
          <Button type="button" onClick={onSend} disabled={disableActions || !to.trim()}>
            {sending ? "Sending..." : "Send"}
          </Button>
        </div>
      </div>
    </article>
  );
}
