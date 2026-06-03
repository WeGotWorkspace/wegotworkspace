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
import type {
  NotesCapabilitiesResponse,
  NotesStateResponse,
  NotesItemsResponse,
  NoteItem,
  NoteUpsertRequest,
  NoteDeleteRequest,
  NotebookListItem,
  NotebookListResponse,
} from "@wgw-api-generated/notes-types";
import type {
  SettingsMailRequest,
  SettingsStateResponse,
  SettingsUserGroup,
  SettingsUserMail,
  SettingsUserMailServer,
  SettingsUserProfile,
} from "@wgw-api-generated/settings-types";
import type {
  AdminAppsSettings,
  AdminGroupCreateRequest,
  AdminGroupSummary,
  AdminGroupUpdateRequest,
  AdminMailSettings,
  AdminSettingsSaveRequest,
  AdminStateResponse,
  AdminUserCreateRequest,
  AdminUserSummary,
  AdminUserUpdateRequest,
  AdminVoiceSettings,
  AdminWebdavSettings,
  UpdateApplyRequest,
  UpdateApplyResponse,
  UpdateBackupItem,
  UpdateLogResponse,
  UpdateStateResponse,
} from "@wgw-api-generated/admin-types";
import type {
  DriveChangeDirRequest,
  DriveCreateRequest,
  DriveCwdResponse,
  DriveDeleteItem,
  DriveDeleteItemsRequest,
  DriveDirectoryData,
  DriveDirectoryEntry,
  DriveEntryType,
  DriveGetDirRequest,
  DriveListingResponse,
  DriveMutationResponse,
  DriveMutationResult,
  DriveRenameRequest,
  DriveRootPath,
  DriveSearchRequest,
  DriveUserData,
  DriveUserResponse,
} from "@wgw-api-generated/drive-types";
import type {
  VoiceChatRequest,
  VoiceChatResponse,
  VoiceJoinRequest,
  VoiceJoinResponse,
  VoiceLeaveRequest,
  VoiceLeaveResponse,
  VoicePeer,
  VoicePollRequest,
  VoicePollResponse,
  VoiceSendRequest,
  VoiceSendResponse,
  VoiceSignalEnvelope,
} from "@wgw-api-generated/voice-types";
import type {
  InstallerAction,
  InstallerActionPayload,
  InstallerActionRequest,
  InstallerActionResponse,
  InstallerBootstrapResponse,
  InstallerCheck,
  InstallerDbDriver,
  InstallerDbState,
  InstallerRuntimeState,
  InstallerStateResponse,
  InstallerStep,
} from "@wgw-api-generated/installer-types";

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

export type WgwNotesCapabilitiesResponse = NotesCapabilitiesResponse;

export type WgwNotesStateResponse = NotesStateResponse;

/** Row from `GET /notes/items`, with optional-friendly narrowing for older payloads. */
export type WgwNoteItem = Omit<
  NoteItem,
  "title" | "body" | "tags" | "starred" | "archived" | "updatedAt" | "username"
> & {
  username?: string;
  title?: string;
  body?: string;
  tags?: string[];
  starred?: boolean;
  archived?: boolean;
  updatedAt?: string;
};

export type WgwNotesItemsResponse = NotesItemsResponse;

export type WgwNoteUpsertRequest = NoteUpsertRequest;

export type WgwNoteDeleteRequest = NoteDeleteRequest;

export type WgwNotebookListItem = NotebookListItem;

export type WgwNotebookListResponse = NotebookListResponse;

export type WgwSettingsStateResponse = SettingsStateResponse;
export type WgwSettingsUserProfile = SettingsUserProfile;
export type WgwSettingsUserGroup = SettingsUserGroup;
export type WgwSettingsUserMail = SettingsUserMail;
export type WgwSettingsUserMailServer = SettingsUserMailServer;
export type WgwSettingsMailRequest = SettingsMailRequest;

export type WgwAdminStateResponse = AdminStateResponse;
export type WgwAdminUserSummary = AdminUserSummary;
export type WgwAdminGroupSummary = AdminGroupSummary;
export type WgwAdminMailSettings = AdminMailSettings;
export type WgwAdminVoiceSettings = AdminVoiceSettings;
export type WgwAdminAppsSettings = AdminAppsSettings;
export type WgwAdminWebdavSettings = AdminWebdavSettings;
export type WgwAdminSettingsSaveRequest = AdminSettingsSaveRequest;
export type WgwAdminUserCreateRequest = AdminUserCreateRequest;
export type WgwAdminUserUpdateRequest = AdminUserUpdateRequest;
export type WgwAdminGroupCreateRequest = AdminGroupCreateRequest;
export type WgwAdminGroupUpdateRequest = AdminGroupUpdateRequest;
export type WgwUpdateStateResponse = UpdateStateResponse;
export type WgwUpdateApplyRequest = UpdateApplyRequest;
export type WgwUpdateApplyResponse = UpdateApplyResponse;
export type WgwUpdateLogResponse = UpdateLogResponse;
export type WgwUpdateBackupItem = UpdateBackupItem;
export type WgwSearchReindexStateResponse = {
  inProgress: boolean;
  phase: string | null;
  phaseProgress: {
    completed: number;
    total: number;
    percent: number;
    updatedAt: string;
  } | null;
  cancelRequested: boolean;
  lastResult: {
    ok: boolean;
    message: string;
    finishedAt: string | null;
  } | null;
  logLines: string[];
};
export type WgwDriveEntryType = DriveEntryType;
export type WgwDriveRootPath = DriveRootPath;
export type WgwDriveDirectoryEntry = DriveDirectoryEntry;
export type WgwDriveDirectoryData = DriveDirectoryData;
export type WgwDriveGetDirRequest = DriveGetDirRequest;
export type WgwDriveSearchRequest = DriveSearchRequest;
export type WgwDriveChangeDirRequest = DriveChangeDirRequest;
export type WgwDriveCreateRequest = DriveCreateRequest;
export type WgwDriveRenameRequest = DriveRenameRequest;
export type WgwDriveDeleteItem = DriveDeleteItem;
export type WgwDriveDeleteItemsRequest = DriveDeleteItemsRequest;
export type WgwDriveUserData = DriveUserData;
export type WgwDriveUserResponse = DriveUserResponse;
export type WgwDriveListingResponse = DriveListingResponse;
export type WgwDriveCwdResponse = DriveCwdResponse;
export type WgwDriveMutationResult = DriveMutationResult;
export type WgwDriveMutationResponse = DriveMutationResponse;
export type WgwDriveStarsData = {
  paths: string[];
};
export type WgwDriveStarsResponse = {
  data: WgwDriveStarsData;
};
export type WgwDriveStarUpdateRequest = {
  path: string;
  starred: boolean;
};
export type WgwVoicePeer = VoicePeer;
export type WgwVoiceSignalEnvelope = VoiceSignalEnvelope;
export type WgwVoiceRoomStatusRequest = {
  room: string;
};
export type WgwVoiceRoomStatusResponse = {
  active: boolean;
};
export type WgwVoiceJoinRequest = VoiceJoinRequest;
export type WgwVoiceJoinResponse = VoiceJoinResponse;
export type WgwVoicePollRequest = VoicePollRequest;
export type WgwVoicePollResponse = VoicePollResponse;
export type WgwVoiceSendRequest = VoiceSendRequest;
export type WgwVoiceSendResponse = VoiceSendResponse;
export type WgwVoiceLeaveRequest = VoiceLeaveRequest;
export type WgwVoiceLeaveResponse = VoiceLeaveResponse;
export type WgwVoiceChatRequest = VoiceChatRequest;
export type WgwVoiceChatResponse = VoiceChatResponse;
export type WgwInstallerStep = InstallerStep;
export type WgwInstallerDbDriver = InstallerDbDriver;
export type WgwInstallerDbState = InstallerDbState;
export type WgwInstallerCheck = InstallerCheck;
export type WgwInstallerRuntimeState = InstallerRuntimeState;
export type WgwInstallerStateResponse = InstallerStateResponse;
export type WgwInstallerBootstrapResponse = InstallerBootstrapResponse;
export type WgwInstallerAction = InstallerAction;
export type WgwInstallerActionPayload = InstallerActionPayload;
export type WgwInstallerActionRequest = InstallerActionRequest;
export type WgwInstallerActionResponse = InstallerActionResponse;

export type WgwPluginIntegrationConfig = {
  configGlobal?: string;
  sessionApiPath?: string;
  saveTransport?: string;
  editorPaths?: string[];
};

export type WgwPluginRuntime = {
  indexReady: boolean;
  editorReady: boolean;
};

export type WgwPluginDriveNewFileTemplate = {
  id: string;
  label: string;
  kind: "doc" | "sheet" | "slides";
  queryValue: string;
};

export type WgwPluginDriveConfig = {
  openFileExtensions?: string[];
  openFileRoute?: string;
  openFileQueryParam?: string;
  newFileTemplates?: WgwPluginDriveNewFileTemplate[];
};

export type WgwPluginAppTile = {
  id: string;
  label: string;
  route: string;
  icon?: string;
};

export type WgwPluginDescriptor = {
  id: string;
  name: string;
  active: boolean;
  source?: string;
  drive?: WgwPluginDriveConfig;
  appTile?: WgwPluginAppTile;
  integration?: WgwPluginIntegrationConfig;
  runtime?: WgwPluginRuntime;
};

export type WgwPluginsResponse = {
  plugins: WgwPluginDescriptor[];
};
