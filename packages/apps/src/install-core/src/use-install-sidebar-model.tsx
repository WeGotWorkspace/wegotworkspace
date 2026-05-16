import type { ReactNode } from "react";
import { installStepSubtitle } from "@/install-core/src/install-labels";
import { INSTALL_STEPS } from "@/install-core/src/install-models";
import type { InstallStepId } from "@/install-core/src/install-types";

export type InstallStepDescriptor = {
  id: InstallStepId;
  label: string;
  description: string;
  icon: ReactNode;
};

export function useInstallSidebarModel(): InstallStepDescriptor[] {
  return INSTALL_STEPS.map((step) => ({
    id: step.id,
    label: step.label,
    icon: step.icon,
    description: installStepSubtitle(step.id),
  }));
}
