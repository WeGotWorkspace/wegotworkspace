import { useMemo, useState } from "react";
import type { SettingsSection } from "@/settings-core/src/settings-types";
import { useSettingsSidebarModel } from "@/settings-core/src/use-settings-sidebar-model";

/** Settings workspace chrome: section navigation and sidebar visibility. */
export function useSettingsShell() {
  const [section, setSection] = useState<SettingsSection>("profile");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sections = useSettingsSidebarModel();
  const currentSection = useMemo(
    () => sections.find((candidate) => candidate.id === section) ?? sections[0],
    [section, sections],
  );

  const selectSection = (nextSection: SettingsSection) => {
    setSection(nextSection);
    if (typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches) {
      setSidebarOpen(false);
    }
  };

  return {
    section,
    sections,
    currentSection,
    sidebarOpen,
    setSidebarOpen,
    selectSection,
  };
}

export type SettingsShellState = ReturnType<typeof useSettingsShell>;
