import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { Paperclip, Trash2 } from "lucide-react";
import { Button, IconButton } from "@/button/src/button";
import { ViewHeader } from "@/view-header/src/view-header";
import { FieldLabelRow } from "@/ui/field-label-row";
import { Input } from "@/ui/input";
import { DialogFooter } from "@/ui/dialog";
import { cn } from "@/lib/utils";
import { TextEditor, TEXT_EDITOR_FORMAT_BAR_MAIL } from "@/text-editor-core/src";
import { MailAttachmentChip } from "@/mail-core/src/mail-attachment-chip";
import { mailWorkspacePaneClasses } from "@/mail-core/src/mail-workspace.styles";
import {
  composeBodyToEditorHtml,
  type MailComposeAttachment,
} from "@/mail-core/src/mail-compose-utils";

export type MailComposeMode = "new" | "reply" | "reply-all" | "forward" | "draft";

type MailComposeViewProps = {
  composeMode?: MailComposeMode;
  mailbox: string;
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  body: string;
  attachments: MailComposeAttachment[];
  onToChange: (value: string) => void;
  onCcChange: (value: string) => void;
  onBccChange: (value: string) => void;
  onSubjectChange: (value: string) => void;
  onBodyChange: (value: string) => void;
  onAddAttachments: (files: File[]) => void;
  onRemoveAttachment: (attachmentId: string) => void;
  attachFilesLabel: string;
  attachmentsLabel: string;
  removeAttachmentLabel: string;
  deleteDraftLabel: string;
  onSaveDraft: () => void;
  onSend: () => void;
  onDiscard: () => void;
  saving: boolean;
  sending: boolean;
  /** Remount the message editor when switching compose drafts. */
  editorKey?: string;
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
  to,
  cc,
  bcc,
  subject,
  body,
  attachments,
  onToChange,
  onCcChange,
  onBccChange,
  onSubjectChange,
  onBodyChange,
  onAddAttachments,
  onRemoveAttachment,
  attachFilesLabel,
  attachmentsLabel,
  removeAttachmentLabel,
  deleteDraftLabel,
  onSaveDraft,
  onSend,
  onDiscard,
  saving,
  sending,
  editorKey,
  className,
}: MailComposeViewProps) {
  const disableActions = saving || sending;
  const [showCcBcc, setShowCcBcc] = useState(() => Boolean(cc.trim() || bcc.trim()));
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (cc.trim() || bcc.trim()) setShowCcBcc(true);
  }, [cc, bcc]);

  const handleFilesSelected = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files ? Array.from(event.target.files) : [];
    if (files.length > 0) onAddAttachments(files);
    event.target.value = "";
  };

  return (
    <div className={cn(mailWorkspacePaneClasses.composeView, className)}>
      <header className={mailWorkspacePaneClasses.composeHeader}>
        <ViewHeader hideSidebarToggle title={composeHeaderTitle(composeMode)} subtitle={mailbox} />
      </header>

      <div className={mailWorkspacePaneClasses.composeBody}>
        <div className={mailWorkspacePaneClasses.composeFields}>
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

          {attachments.length > 0 ? (
            <div className={mailWorkspacePaneClasses.composeAttachmentsSection}>
              <ul
                className={mailWorkspacePaneClasses.composeAttachmentsList}
                aria-label={attachmentsLabel}
              >
                {attachments.map((attachment) => (
                  <li key={attachment.id}>
                    <MailAttachmentChip
                      name={attachment.filename}
                      mimeType={attachment.mimeType}
                      sizeBytes={attachment.size}
                      removeLabel={`${removeAttachmentLabel}: ${attachment.filename}`}
                      disabled={disableActions}
                      onRemove={() => onRemoveAttachment(attachment.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <div className={mailWorkspacePaneClasses.composeMessageShell}>
          <FieldLabelRow label="Message" className={mailWorkspacePaneClasses.composeMessageField}>
            <TextEditor
              key={editorKey}
              format="html"
              sheetVariant="sheet"
              sheetFill
              editable={!disableActions}
              content={composeBodyToEditorHtml(body)}
              placeholder="Write your message..."
              formatBar={{ groups: TEXT_EDITOR_FORMAT_BAR_MAIL, showPrint: false }}
              className={mailWorkspacePaneClasses.composeMessageEditor}
              onUpdate={({ content }) => onBodyChange(content)}
            />
          </FieldLabelRow>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className={mailWorkspacePaneClasses.composeAttachmentsInput}
        onChange={handleFilesSelected}
      />

      <DialogFooter className={mailWorkspacePaneClasses.composeFooter}>
        <div className={mailWorkspacePaneClasses.composeFooterStart}>
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            label={attachFilesLabel}
            icon={<Paperclip className="size-4" aria-hidden />}
            onClick={() => fileInputRef.current?.click()}
            disabled={disableActions}
          />
          <IconButton
            type="button"
            variant="ghost"
            size="sm"
            label={deleteDraftLabel}
            icon={<Trash2 className="size-4" aria-hidden />}
            onClick={onDiscard}
            disabled={disableActions}
          />
        </div>
        <div className={mailWorkspacePaneClasses.composeFooterEnd}>
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
        </div>
      </DialogFooter>
    </div>
  );
}
