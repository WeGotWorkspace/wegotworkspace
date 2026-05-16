import {
  installerDatabaseNext,
  installerDatabaseTest,
  installerInstall,
  installerRequirementsCheck,
  installerRequirementsNext,
  installerSiteNext,
  installerWelcomeNext,
} from "@/lib/api/wgw/installer";
import type { InstallAPIOperations } from "@/install-core/src/install-types";

export const wgwInstallOperations: InstallAPIOperations = {
  welcomeNext: () => installerWelcomeNext(),
  requirementsCheck: (payload) => installerRequirementsCheck(payload),
  requirementsNext: (payload) => installerRequirementsNext(payload),
  databaseTest: (payload) => installerDatabaseTest(payload),
  databaseNext: (payload) => installerDatabaseNext(payload),
  siteNext: (payload) => installerSiteNext(payload),
  install: (payload) => installerInstall(payload),
};
