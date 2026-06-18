/**
 * Re-exports the production notes offline schema for multi-domain tests and docs.
 * Runtime registration lives in `notes-schema.ts` (imported via `offline-db` shim).
 */
export {
  NOTES_DOMAIN,
  notesNotesTable,
  notesNotebooksTable,
  type OfflineNoteRow,
  type OfflineNotebookRow,
} from "@/lib/offline/notes/notes-schema";
export { NOTES_OFFLINE_VERSION } from "@/lib/offline/core/offline-version-allocation";
