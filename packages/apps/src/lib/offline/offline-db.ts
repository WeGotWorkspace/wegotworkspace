/**
 * @deprecated Generic database helpers now live in `@/lib/offline/core/offline-db`
 * and contacts table types in `@/lib/offline/contacts/contacts-schema`. This shim
 * preserves the historical import path and guarantees the contacts schema is
 * registered before the database opens.
 */
import "@/lib/offline/contacts/contacts-schema";

export {
  CORE_OFFLINE_VERSION,
  WgwOfflineDatabase,
  offlineAccountKeyFromUsername,
  offlineDbForAccount,
  registerOfflineDomainTables,
} from "@/lib/offline/core/offline-db";
export type { OfflineMetaRow, OfflineOutboxRow } from "@/lib/offline/core/types";
export type {
  OfflineAddressBookRow,
  OfflineContactCardRow,
} from "@/lib/offline/contacts/contacts-schema";
