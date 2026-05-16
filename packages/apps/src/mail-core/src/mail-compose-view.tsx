import { useEffect, useState } from "react";
import { Button } from "@/button/src/button";
import { ViewHeader } from "@/view-header/src/view-header";
import { FieldLabelRow } from "@/ui/field-label-row";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";
import { DialogFooter } from "@/ui/dialog";
import { cn } from "@/lib/utils";
import { mailWorkspacePaneClasses } from "@/mail-core/src/mail-workspace.styles";

export type MailComposeMode = "new" | "reply" | "reply-all" | "forward" | "draft";

type MailComposeViewProps = {
  composeMode?: MailComposeMode;
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

function composeHeaderTitle(mode: MailComposeMode): string {
  switch (mode) {
    case "reply":
      return "Reply";
    case "reply-all":
      return "Reply all";
    case "forward":
      return "Forward";
    case "draft":
      return "Edit draft";
    default:
      return "New message";
  }
}

export function MailComposeView({
  composeMode = "new",
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
  const [showCcBcc, setShowCcBcc] = useState(() => Boolean(cc.trim() || bcc.trim()));

  useEffect(() => {
    if (cc.trim() || bcc.trim()) setShowCcBcc(true);
  }, [cc, bcc]);

  return (
    <div className={cn(mailWorkspacePaneClasses.composeView, className)}>
      <header className={mailWorkspacePaneClasses.composeHeader}>
        <ViewHeader
          hideSidebarToggle
          title={composeHeaderTitle(composeMode)}
          subtitle={`${mailbox} · ${date}`}
        />
      </header>

      <div className={mailWorkspacePaneClasses.composeBody}>
        <FieldLabelRow label="To" className={mailWorkspacePaneClasses.composeField}>
          <div className={mailWorkspacePaneClasses.composeToRow}>
            <Input
              className={mailWorkspacePaneClasses.composeToInput}
              value={to}
              onChange={(event) => onToChange(event.target.value)}
              placeholder="alice@example.com, bob@example.com"
              autoComplete="off"
            />
            {!showCcBcc ? (
              <Button
                type="button"
                size="sm"
                variant="primary"
                label="(B)cc"
                onClick={() => setShowCcBcc(true)}
              />
            ) : null}
          </div>
        </FieldLabelRow>

        {showCcBcc ? (
          <>
            <FieldLabelRow label="Cc" className={mailWorkspacePaneClasses.composeField}>
              <Input
                value={cc}
                onChange={(event) => onCcChange(event.target.value)}
                placeholder="Optional"
                autoComplete="off"
              />
            </FieldLabelRow>
            <FieldLabelRow label="Bcc" className={mailWorkspacePaneClasses.composeField}>
              <Input
                value={bcc}
                onChange={(event) => onBccChange(event.target.value)}
                placeholder="Optional"
                autoComplete="off"
              />
            </FieldLabelRow>
          </>
        ) : null}

        <FieldLabelRow label="Subject" className={mailWorkspacePaneClasses.composeField}>
          <Input
            value={subject}
            onChange={(event) => onSubjectChange(event.target.value)}
            placeholder="Subject"
            autoComplete="off"
          />
        </FieldLabelRow>

        <FieldLabelRow label="Message" className={mailWorkspacePaneClasses.composeMessageField}>
          <Textarea
            value={body}
            onChange={(event) => onBodyChange(event.target.value)}
            placeholder="Write your message..."
            className={mailWorkspacePaneClasses.composeMessageInput}
          />
        </FieldLabelRow>
      </div>

      <DialogFooter className={mailWorkspacePaneClasses.composeFooter}>
        <Button
          type="button"
          variant="ghost"
          onClick={onDiscard}
          disabled={disableActions}
          label="Discard"
        />
        <Button
          type="button"
          variant="outline"
          onClick={onSaveDraft}
          disabled={disableActions}
          label={saving ? "Saving..." : "Save draft"}
        />
        <Button
          type="button"
          variant="primary"
          onClick={onSend}
          disabled={disableActions || !to.trim()}
          label={sending ? "Sending..." : "Send"}
        />
      </DialogFooter>
    </div>
  );
}
