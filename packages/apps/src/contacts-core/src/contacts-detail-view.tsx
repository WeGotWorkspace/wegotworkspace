import type { ReactNode } from "react";
import { Plus, X } from "lucide-react";
import { Button, IconButton } from "@/button/src/button";
import { UserAvatar } from "@/user-avatar/src/user-avatar";
import { FieldLabelRow } from "@/ui/field-label-row";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Switch } from "@/ui/switch";
import { cn } from "@/lib/utils";
import type { ContactCard } from "@/contacts-core/src/contacts-types";
import {
  CONTACT_CHANNEL_CONTEXTS,
  readContactContext,
  type ContactAddressDraft,
  type ContactChannelContext,
  type ContactEditDraft,
} from "@/contacts-core/src/contacts-edit-utils";
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
  onAddAddress: () => void;
  onUpdatePhone: (id: string, number: string) => void;
  onUpdateEmail: (id: string, address: string) => void;
  onUpdatePhoneContext: (id: string, contextType: ContactChannelContext) => void;
  onUpdateEmailContext: (id: string, contextType: ContactChannelContext) => void;
  onUpdateAddress: (
    id: string,
    field: keyof Omit<ContactAddressDraft, "id" | "contextType">,
    value: string,
  ) => void;
  onUpdateAddressContext: (id: string, contextType: ContactChannelContext) => void;
  onAddUrl: () => void;
  onUpdateUrl: (id: string, uri: string) => void;
  onUpdateUrlContext: (id: string, contextType: ContactChannelContext) => void;
  onRemoveUrl: (id: string) => void;
  onRemovePhone: (id: string) => void;
  onRemoveEmail: (id: string) => void;
  onRemoveAddress: (id: string) => void;
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
  if (typeof address.full === "string" && address.full.trim()) return address.full.trim();
  const legacy = [
    (address as { street?: string }).street,
    (address as { locality?: string }).locality,
    (address as { region?: string }).region,
    (address as { postcode?: string }).postcode,
    (address as { country?: string }).country,
  ]
    .map((part) => (typeof part === "string" ? part.trim() : ""))
    .filter(Boolean);
  return legacy.join(", ");
}

function channelTypeLabel(contextType: ContactChannelContext, labels: ContactsUILabels): string {
  if (contextType === "work") return labels.channelTypeWork;
  if (contextType === "home") return labels.channelTypeHome;
  if (contextType === "school") return labels.channelTypeSchool;
  return labels.channelTypeNone;
}

function channelDisplayLabel(
  contexts: Record<string, boolean | undefined> | undefined,
  labels: ContactsUILabels,
  customLabel?: string,
): string | undefined {
  const contextType = readContactContext(contexts);
  if (contextType !== "") return channelTypeLabel(contextType, labels);
  const trimmed = customLabel?.trim();
  if (trimmed) return trimmed;
  return undefined;
}

function ContextTypeSelect({
  labels,
  value,
  onChange,
  ariaLabel,
}: {
  labels: ContactsUILabels;
  value: ContactChannelContext;
  onChange: (value: ContactChannelContext) => void;
  ariaLabel: string;
}) {
  return (
    <Select
      value={value || "none"}
      onValueChange={(next) => onChange(next === "none" ? "" : (next as ContactChannelContext))}
    >
      <SelectTrigger aria-label={ariaLabel} className="contacts-detail-view__context-select">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {CONTACT_CHANNEL_CONTEXTS.map((contextType) => (
          <SelectItem key={contextType || "none"} value={contextType || "none"}>
            {channelTypeLabel(contextType, labels)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
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
  onAddAddress,
  onUpdatePhone,
  onUpdateEmail,
  onUpdatePhoneContext,
  onUpdateEmailContext,
  onUpdateAddress,
  onUpdateAddressContext,
  onAddUrl,
  onUpdateUrl,
  onUpdateUrlContext,
  onRemoveUrl,
  onRemovePhone,
  onRemoveEmail,
  onRemoveAddress,
  className,
}: ContactsDetailViewProps) {
  const isEditing = editMode && !!editDraft;

  const readPhones = isEditing
    ? (editDraft?.phones ?? [])
    : mapEntriesSorted(card?.phones).map(([id, phone]) => ({
        id,
        number: phoneDisplayValue(phone),
        contextLabel: channelDisplayLabel(phone.contexts, labels, phone.label),
      }));

  const readEmails = isEditing
    ? (editDraft?.emails ?? [])
    : mapEntriesSorted(card?.emails).map(([id, email]) => ({
        id,
        address: email.address?.trim() || "",
        contextLabel: channelDisplayLabel(email.contexts, labels, email.label),
      }));

  const readAddresses = isEditing
    ? (editDraft?.addresses ?? [])
    : mapEntriesSorted(card?.addresses).map(([id, address]) => ({
        id,
        line: formatAddressLine(address),
        contextLabel: channelDisplayLabel(
          address.contexts,
          labels,
          typeof address.label === "string" ? address.label : undefined,
        ),
      }));

  const readUrls = isEditing
    ? (editDraft?.urls ?? [])
    : mapEntriesSorted(card?.links)
        .filter(([, link]) => link.kind !== "contact")
        .map(([id, link]) => ({
          id,
          uri: link.uri?.trim() ?? "",
          contextLabel: channelDisplayLabel(link.contexts, labels, link.label),
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
          <div className="contacts-detail-view__field-stack">
            <FieldLabelRow label={labels.nameGiven} htmlFor="contact-given-name">
              <Input
                id="contact-given-name"
                value={editDraft.nameGiven}
                onChange={(event) => onDraftChange({ nameGiven: event.target.value })}
              />
            </FieldLabelRow>
            {editDraft.showGiven2 ? (
              <FieldLabelRow label={labels.nameGiven2} htmlFor="contact-given2-name">
                <Input
                  id="contact-given2-name"
                  value={editDraft.nameGiven2}
                  onChange={(event) => onDraftChange({ nameGiven2: event.target.value })}
                />
              </FieldLabelRow>
            ) : null}
            <FieldLabelRow label={labels.nameSurname} htmlFor="contact-surname">
              <Input
                id="contact-surname"
                value={editDraft.nameSurname}
                onChange={(event) => onDraftChange({ nameSurname: event.target.value })}
              />
            </FieldLabelRow>
            <FieldLabelRow label={labels.organizationName} htmlFor="contact-organization">
              <Input
                id="contact-organization"
                value={editDraft.organization}
                onChange={(event) => onDraftChange({ organization: event.target.value })}
              />
            </FieldLabelRow>
            <FieldLabelRow label={labels.companyContact}>
              <Switch
                checked={editDraft.showAsCompany}
                onCheckedChange={(checked) => onDraftChange({ showAsCompany: checked })}
                aria-label={labels.companyContact}
              />
            </FieldLabelRow>
          </div>
        ) : (
          <p className="contacts-detail-view__text">{card ? contactDisplayName(card) : ""}</p>
        )}
      </DetailSection>

      {!isEditing && organization ? (
        <DetailSection title={labels.sectionOrganization}>
          <p className="contacts-detail-view__text">{organization}</p>
        </DetailSection>
      ) : null}

      <DetailSection title={labels.sectionPhones} hidden={!isEditing && readPhones.length === 0}>
        {isEditing && editDraft ? (
          <div className="contacts-detail-view__editable-list">
            {editDraft.phones.map((row) => (
              <div key={row.id} className="contacts-detail-view__editable-row">
                <ContextTypeSelect
                  labels={labels}
                  value={row.contextType}
                  ariaLabel={`${labels.channelType} ${labels.phoneNumber}`}
                  onChange={(contextType) => onUpdatePhoneContext(row.id, contextType)}
                />
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
            {readPhones.map((row) => (
              <li key={row.id} className="contacts-detail-view__value-item">
                <span>{"number" in row ? row.number : ""}</span>
                {"contextLabel" in row && row.contextLabel ? (
                  <span className="contacts-detail-view__meta">{row.contextLabel}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title={labels.sectionEmails} hidden={!isEditing && readEmails.length === 0}>
        {isEditing && editDraft ? (
          <div className="contacts-detail-view__editable-list">
            {editDraft.emails.map((row) => (
              <div key={row.id} className="contacts-detail-view__editable-row">
                <ContextTypeSelect
                  labels={labels}
                  value={row.contextType}
                  ariaLabel={`${labels.channelType} ${labels.emailAddress}`}
                  onChange={(contextType) => onUpdateEmailContext(row.id, contextType)}
                />
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
            {readEmails.map((row) => (
              <li key={row.id} className="contacts-detail-view__value-item">
                <span>{"address" in row ? row.address : ""}</span>
                {"contextLabel" in row && row.contextLabel ? (
                  <span className="contacts-detail-view__meta">{row.contextLabel}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection
        title={labels.sectionAddresses}
        hidden={!isEditing && readAddresses.length === 0}
      >
        {isEditing && editDraft ? (
          <div className="contacts-detail-view__editable-list">
            {editDraft.addresses.map((row) => (
              <div key={row.id} className="contacts-detail-view__address-block">
                <div className="contacts-detail-view__editable-row">
                  <ContextTypeSelect
                    labels={labels}
                    value={row.contextType}
                    ariaLabel={`${labels.channelType} ${labels.sectionAddresses}`}
                    onChange={(contextType) => onUpdateAddressContext(row.id, contextType)}
                  />
                  <IconButton
                    label={labels.removeRow}
                    icon={<X className="size-4" />}
                    variant="subtle"
                    size="sm"
                    onClick={() => onRemoveAddress(row.id)}
                  />
                </div>
                <div className="contacts-detail-view__field-stack">
                  <FieldLabelRow
                    label={labels.addressStreet}
                    htmlFor={`contact-address-street-${row.id}`}
                  >
                    <Input
                      id={`contact-address-street-${row.id}`}
                      aria-label={labels.addressStreet}
                      value={row.street}
                      onChange={(event) => onUpdateAddress(row.id, "street", event.target.value)}
                    />
                  </FieldLabelRow>
                  <FieldLabelRow
                    label={labels.addressLocality}
                    htmlFor={`contact-address-locality-${row.id}`}
                  >
                    <Input
                      id={`contact-address-locality-${row.id}`}
                      aria-label={labels.addressLocality}
                      value={row.locality}
                      onChange={(event) => onUpdateAddress(row.id, "locality", event.target.value)}
                    />
                  </FieldLabelRow>
                  <FieldLabelRow
                    label={labels.addressRegion}
                    htmlFor={`contact-address-region-${row.id}`}
                  >
                    <Input
                      id={`contact-address-region-${row.id}`}
                      aria-label={labels.addressRegion}
                      value={row.region}
                      onChange={(event) => onUpdateAddress(row.id, "region", event.target.value)}
                    />
                  </FieldLabelRow>
                  <FieldLabelRow
                    label={labels.addressPostalCode}
                    htmlFor={`contact-address-postal-${row.id}`}
                  >
                    <Input
                      id={`contact-address-postal-${row.id}`}
                      aria-label={labels.addressPostalCode}
                      value={row.postalCode}
                      onChange={(event) =>
                        onUpdateAddress(row.id, "postalCode", event.target.value)
                      }
                    />
                  </FieldLabelRow>
                  <FieldLabelRow
                    label={labels.addressCountry}
                    htmlFor={`contact-address-country-${row.id}`}
                  >
                    <Input
                      id={`contact-address-country-${row.id}`}
                      aria-label={labels.addressCountry}
                      value={row.country}
                      onChange={(event) => onUpdateAddress(row.id, "country", event.target.value)}
                    />
                  </FieldLabelRow>
                </div>
              </div>
            ))}
            <Button
              label={labels.addAddress}
              icon={<Plus className="size-4" />}
              variant="subtle"
              size="sm"
              onClick={onAddAddress}
            />
          </div>
        ) : (
          <ul className="contacts-detail-view__value-list">
            {readAddresses.map((row) => (
              <li key={row.id} className="contacts-detail-view__value-item">
                <span>{"line" in row ? row.line : ""}</span>
                {"contextLabel" in row && row.contextLabel ? (
                  <span className="contacts-detail-view__meta">{row.contextLabel}</span>
                ) : null}
              </li>
            ))}
          </ul>
        )}
      </DetailSection>

      <DetailSection title={labels.sectionUrls} hidden={!isEditing && readUrls.length === 0}>
        {isEditing && editDraft ? (
          <div className="contacts-detail-view__editable-list">
            {editDraft.urls.map((row) => (
              <div key={row.id} className="contacts-detail-view__editable-row">
                <ContextTypeSelect
                  labels={labels}
                  value={row.contextType}
                  ariaLabel={`${labels.channelType} ${labels.urlAddress}`}
                  onChange={(contextType) => onUpdateUrlContext(row.id, contextType)}
                />
                <Input
                  aria-label={labels.urlAddress}
                  value={row.uri}
                  onChange={(event) => onUpdateUrl(row.id, event.target.value)}
                />
                <IconButton
                  label={labels.removeRow}
                  icon={<X className="size-4" />}
                  variant="subtle"
                  size="sm"
                  onClick={() => onRemoveUrl(row.id)}
                />
              </div>
            ))}
            <Button
              label={labels.addUrl}
              icon={<Plus className="size-4" />}
              variant="subtle"
              size="sm"
              onClick={onAddUrl}
            />
          </div>
        ) : (
          <ul className="contacts-detail-view__value-list">
            {readUrls.map((row) => (
              <li key={row.id} className="contacts-detail-view__value-item">
                <a
                  className="contacts-detail-view__link"
                  href={row.uri}
                  target="_blank"
                  rel="noreferrer"
                >
                  {row.uri}
                </a>
                {"contextLabel" in row && row.contextLabel ? (
                  <span className="contacts-detail-view__meta">{row.contextLabel}</span>
                ) : null}
              </li>
            ))}
          </ul>
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
