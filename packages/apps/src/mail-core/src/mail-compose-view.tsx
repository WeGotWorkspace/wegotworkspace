import { CalendarDays, Mailbox } from "lucide-react";
import { DetailViewHeader } from "@/detail-view-header/src/detail-view-header";
import { Button } from "@/button/src/button";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { cn } from "@/lib/utils";
import {
  mailDetailTagColors,
  mailWorkspacePaneClasses,
} from "@/mail-core/src/mail-workspace.styles";

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
    <label className={mailWorkspacePaneClasses.composeField}>
      <span className={mailWorkspacePaneClasses.composeFieldLabel}>{label}</span>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
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
    <article className={cn(mailWorkspacePaneClasses.composeView, className)}>
      <DetailViewHeader
        topTags={[
          {
            key: "mailbox",
            label: mailbox,
            icon: <Mailbox className="size-3.5 opacity-70" />,
            colors: mailDetailTagColors.primary,
          },
          {
            key: "date",
            label: date,
            icon: <CalendarDays className="size-3.5 opacity-70" />,
            colors: mailDetailTagColors.muted,
          },
        ]}
        title={subject}
        editable
        onTitleChange={onSubjectChange}
        titleKey={`${mailId}-compose-subject`}
        titleClassName={mailWorkspacePaneClasses.composeTitle}
        titlePlaceholder="Subject"
      />

      <div className={mailWorkspacePaneClasses.composeFields}>
        <ComposeField
          label="To"
          value={to}
          onChange={onToChange}
          placeholder="alice@example.com, bob@example.com"
        />
        <ComposeField label="Cc" value={cc} onChange={onCcChange} placeholder="Optional" />
        <ComposeField label="Bcc" value={bcc} onChange={onBccChange} placeholder="Optional" />

        <label className={mailWorkspacePaneClasses.composeBody}>
          <span className="sr-only">Message body</span>
          <Textarea
            value={body}
            onChange={(event) => onBodyChange(event.target.value)}
            placeholder="Write your message..."
          />
        </label>

        <div className={mailWorkspacePaneClasses.composeActions}>
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
