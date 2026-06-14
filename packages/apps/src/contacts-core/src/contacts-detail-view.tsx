import type { ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { Button, IconButton } from "@/button/src/button";
import { UserAvatar } from "@/user-avatar/src/user-avatar";
import { FieldLabelRow } from "@/ui/field-label-row";
import { Input } from "@/ui/input";
import { cn } from "@/lib/utils";
import type { ContactCard } from "@/contacts-core/src/contacts-types";
import type { ContactEditDraft } from "@/contacts-core/src/contacts-edit-utils";
import { contactDisplayName, mapEntriesSorted } from "@/contacts-core/src/contacts-display-utils";
import type { ContactsUILabels } from "@/contacts-core/src/contacts-labels";

type ContactsDetailViewProps = {
  labels: ContactsUILabels;
  card?: ContactCard;
  createMode: boolean;
  editMode: boolean;
  editDraft: ContactEditDraft | null;
  displayName: string;
  onDraftChange: (patch: Partial<ContactEditDraft>) => void;
  onAddPhone: () => void;
  onAddEmail: () => void;
  onUpdatePhone: (id: string, number: string) => void;
  onUpdateEmail: (id: string, address: string) => void;
  onRemovePhone: (id: string) => void;
  onRemoveEmail: (id: string) => void;
  className?: string;
};

function phoneDisplayValue(phone: NonNullable<ContactCard["phones"]>[string]): string {
  if (typeof phone.number === "string") return phone.number.trim();
  if (typeof phone.uri === "string") return phone.uri.trim();
  return "";
}

function formatAddressLine(address: NonNullable<ContactCard["addresses"]>[string]): string {
  const components = address.components ?? [];
  const fromComponents = components
    .map((part) => part.value?.trim())
    .filter(Boolean)
    .join(", ");
  if (fromComponents) return fromComponents;
  return "";
}

function DetailSection({
  title,
  children,
  hidden,
}: {
  title: string;
  children: ReactNode;
  hidden?: boolean;
}) {
  if (hidden) return null;
  return (
    <section className="contacts-detail-view__section">
      <h2 className="contacts-detail-view__section-title">{title}</h2>
      <div className="contacts-detail-view__section-body">{children}</div>
    </section>
  );
}

export function ContactsDetailView({
  labels,
  card,
  createMode,
  editMode,
  editDraft,
  displayName,
  onDraftChange,
  onAddPhone,
  onAddEmail,
  onUpdatePhone,
  onUpdateEmail,
  onRemovePhone,
  onRemoveEmail,
  className,
}: ContactsDetailViewProps) {
  const isEditing = editMode && !!editDraft;

  const phones = isEditing
    ? (editDraft?.phones ?? [])
    : mapEntriesSorted(card?.phones).map(([id, phone]) => ({
        id,
        number: phoneDisplayValue(phone),
        label: phone.label,
      }));

  const emails = isEditing
    ? (editDraft?.emails ?? [])
    : mapEntriesSorted(card?.emails).map(([id, email]) => ({
        id,
        address: email.address?.trim() || "",
        label: email.label,
      }));

  const addresses = mapEntriesSorted(card?.addresses).map(([id, address]) => ({
    id,
    label: typeof address.label === "string" ? address.label : undefined,
    line: formatAddressLine(address),
  }));

  const organization = isEditing
    ? (editDraft?.organization ?? "")
    : (() => {
        const name = mapEntriesSorted(card?.organizations)[0]?.[1]?.name;
        return typeof name === "string" ? name.trim() : "";
      })();

  const notes = isEditing
    ? (editDraft?.notes ?? "")
    : (() => {
        const note = mapEntriesSorted(card?.notes)[0]?.[1]?.note;
        return typeof note === "string" ? note.trim() : "";
      })();

  return (
    <article className={cn("contacts-detail-view", className)}>
      <header className="contacts-detail-view__header">
        <UserAvatar displayName={displayName} size="lg" compact />
        {!isEditing && card ? (
          <h1 className="contacts-detail-view__title">{contactDisplayName(card)}</h1>
        ) : null}
        {createMode && isEditing ? (
          <h1 className="contacts-detail-view__title">{labels.newContact}</h1>
        ) : null}
      </header>

      <DetailSection title={labels.sectionName} hidden={!isEditing && !card?.name}>
        {isEditing && editDraft ? (
          editDraft.useComponentName ? (
            <div className="contacts-detail-view__field-stack">
              <FieldLabelRow label={labels.nameGiven} htmlFor="contact-given-name">
                <Input
                  id="contact-given-name"
                  value={editDraft.nameGiven}
                  onChange={(event) => onDraftChange({ nameGiven: event.target.value })}
                />
              </FieldLabelRow>
              <FieldLabelRow label={labels.nameSurname} htmlFor="contact-surname">
                <Input
                  id="contact-surname"
                  value={editDraft.nameSurname}
                  onChange={(event) => onDraftChange({ nameSurname: event.target.value })}
                />
              </FieldLabelRow>
            </div>
          ) : (
            <FieldLabelRow label={labels.nameFull} htmlFor="contact-full-name">
              <Input
                id="contact-full-name"
                value={editDraft.nameFull}
                onChange={(event) => onDraftChange({ nameFull: event.target.value })}
              />
            </FieldLabelRow>
          )
        ) : (
          <p className="contacts-detail-view__text">{card ? contactDisplayName(card) : ""}</p>
        )}
      </DetailSection>

      <DetailSection title={labels.sectionPhones} hidden={!isEditing && phones.length === 0}>
        {isEditing ? (
          <div className="contacts-detail-view__editable-list">
            {phones.map((row: { id: string; number: string; label?: string }) => (
              <div key={row.id} className="contacts-detail-view__editable-row">
                <Input
                  aria-label={labels.phoneNumber}
                  value={row.number}
                  onChange={(event) => onUpdatePhone(row.id, event.target.value)}
                />
                <IconButton
                  label={labels.removeRow}
                  icon={<X className="size-4" />}
                  variant="subtle"
                  size="sm"
                  onClick={() => onRemovePhone(row.id)}
                />
              </div>
            ))}
            <Button
              label={labels.addPhone}
              icon={<Plus className="size-4" />}
              variant="subtle"
              size="sm"
              onClick={onAddPhone}
            />
          </div>
        ) : (
          <ul className="contacts-detail-view__value-list">
            {phones.map((row: { id: string; number: string; label?: string }) => (
              <li key={row.id} className="contacts-detail-view__value-item">
                <span>{row.number}</span>
                {typeof row.label === "string" && row.label ? (
                  <span className="contacts-detail-view__meta">{row.label}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title={labels.sectionEmails} hidden={!isEditing && emails.length === 0}>
        {isEditing ? (
          <div className="contacts-detail-view__editable-list">
            {emails.map((row: { id: string; address: string; label?: string }) => (
              <div key={row.id} className="contacts-detail-view__editable-row">
                <Input
                  aria-label={labels.emailAddress}
                  value={row.address}
                  onChange={(event) => onUpdateEmail(row.id, event.target.value)}
                />
                <IconButton
                  label={labels.removeRow}
                  icon={<X className="size-4" />}
                  variant="subtle"
                  size="sm"
                  onClick={() => onRemoveEmail(row.id)}
                />
              </div>
            ))}
            <Button
              label={labels.addEmail}
              icon={<Plus className="size-4" />}
              variant="subtle"
              size="sm"
              onClick={onAddEmail}
            />
          </div>
        ) : (
          <ul className="contacts-detail-view__value-list">
            {emails.map((row: { id: string; address: string; label?: string }) => (
              <li key={row.id} className="contacts-detail-view__value-item">
                <span>{row.address}</span>
                {typeof row.label === "string" && row.label ? (
                  <span className="contacts-detail-view__meta">{row.label}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title={labels.sectionAddresses} hidden={isEditing || addresses.length === 0}>
        <ul className="contacts-detail-view__value-list">
          {addresses.map((row) => (
            <li key={row.id} className="contacts-detail-view__value-item">
              <span>{row.line}</span>
              {row.label ? <span className="contacts-detail-view__meta">{row.label}</span> : null}
            </li>
          ))}
        </ul>
      </DetailSection>

      <DetailSection title={labels.sectionOrganization} hidden={!isEditing && !organization}>
        {isEditing && editDraft ? (
          <FieldLabelRow label={labels.organizationName} htmlFor="contact-organization">
            <Input
              id="contact-organization"
              value={editDraft.organization}
              onChange={(event) => onDraftChange({ organization: event.target.value })}
            />
          </FieldLabelRow>
        ) : (
          <p className="contacts-detail-view__text">{organization}</p>
        )}
      </DetailSection>

      <DetailSection title={labels.sectionNotes} hidden={!isEditing && !notes}>
        {isEditing && editDraft ? (
          <FieldLabelRow label={labels.notesText} htmlFor="contact-notes">
            <Input
              id="contact-notes"
              value={editDraft.notes}
              onChange={(event) => onDraftChange({ notes: event.target.value })}
            />
          </FieldLabelRow>
        ) : (
          <p className="contacts-detail-view__text">{notes}</p>
        )}
      </DetailSection>
    </article>
  );
}
