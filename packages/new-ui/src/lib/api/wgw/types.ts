/**
 * Concrete shapes for WeGotWorkspace `/api/v1` mail + notes payloads.
 * Built on top of generated OpenAPI aliases with app-specific narrowing where needed.
 */

import type {
  MailDraftRequest,
  MailSendRequest,
  MailFolder,
  MailMessageDetail,
  MailMessageListItem,
  MailMessagePatchRequest,
  MailMoveRequest,
  MailStatusResponse,
} from "@wgw-api-generated/mail-types";

export type WgwMailStatusResponse = MailStatusResponse & {
  extImap?: boolean;
  serversConfigured?: boolean;
  accountConfigured?: boolean;
  ready?: boolean;
};

export type WgwMailFolderNode = MailFolder & {
  id: string;
  name: string;
  system?: string | null;
  unread?: number;
  unreadCount?: number;
  children?: WgwMailFolderNode[];
};

export type WgwMailFoldersResponse = {
  folders: WgwMailFolderNode[];
};

/** Row from `GET /mail/messages` (typed from OpenAPI with local field narrowing). */
export type WgwMailMessageListItem = MailMessageListItem & {
  id?: string;
  folder: string;
  folderId?: string;
  uid: number;
  messageId?: string;
  from?: string | { name?: string; address?: string; email?: string };
  subject?: string;
  snippet?: string;
  preview?: string;
  date?: string;
  read?: boolean;
  flagged?: boolean;
  starred?: boolean;
};

export type WgwMailMessagesResponse = {
  messages: WgwMailMessageListItem[];
  hasMore?: boolean;
};

export type WgwMailAttachmentSummary = {
  id?: string;
  name: string;
  size?: number;
  type?: string;
  part?: string;
};

export type WgwMailMessageDetail = Omit<MailMessageDetail & WgwMailMessageListItem, "bodyHtml"> & {
  /** Canonical plain-text body used by the app. */
  body: string;
  /** Nullable HTML body from backend detail endpoint. */
  bodyHtml: string | null;
  /** Attachment metadata normalized for UI consumption. */
  attachments?: WgwMailAttachmentSummary[];
};

export type WgwMailMessageResponse = {
  message: WgwMailMessageDetail;
};

export type WgwMailMessagePatchRequest = MailMessagePatchRequest & {
  folder: string;
  uid: number;
  read?: boolean;
  starred?: boolean;
};

export type WgwMailMoveRequest = MailMoveRequest & {
  fromFolder: string;
  toFolder: string;
  uid: number;
};

export type WgwMailDraftRequest = MailDraftRequest;
export type WgwMailSendRequest = MailSendRequest;

export type WgwNotesCapabilitiesResponse = {
  enabled?: boolean;
  distReady?: boolean;
  baseUri?: string;
};

export type WgwNotesStateResponse = {
  baseUri?: string;
  username?: string;
  displayName?: string;
  logoutUrl?: string;
  notesPath?: string;
  filesEnabled?: boolean;
  distReady?: boolean;
};

/** Row from `GET /notes/items`. */
export type WgwNoteItem = {
  id: string;
  notebook: string;
  title?: string;
  body?: string;
  tags?: string[];
  starred?: boolean;
  archived?: boolean;
  updatedAt?: string;
};

export type WgwNotesItemsResponse = {
  items: WgwNoteItem[];
};

export type WgwNoteUpsertRequest = {
  id?: string;
  notebook?: string;
  title?: string;
  body?: string;
  tags?: string[];
  starred?: boolean;
  archived?: boolean;
};

export type WgwNoteDeleteRequest = {
  notebook?: string;
  archived?: boolean;
};

export type WgwNotebookListItem = {
  name: string;
  activeCount?: number;
  archivedCount?: number;
};

export type WgwNotebookListResponse = {
  items: WgwNotebookListItem[];
};
