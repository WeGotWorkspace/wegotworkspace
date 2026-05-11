import { useMemo, useState } from "react";
import { Check } from "lucide-react";
import { toast } from "sonner";
import type { SettingsSection } from "@/settings-core/src/settings-types";
import type { SettingsWorkspaceProps } from "@/settings-core/src/settings-workspace-props";
import { useSettingsSidebarModel } from "@/settings-core/src/use-settings-sidebar-model";

export function useSettingsController({
  data,
  operations,
}: Pick<SettingsWorkspaceProps, "data" | "operations">) {
  const [section, setSection] = useState<SettingsSection>("profile");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [displayName, setDisplayName] = useState(data.user.displayName);
  const [email, setEmail] = useState(data.user.email);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [imapUsername, setImapUsername] = useState(data.mail.imapUsername);
  const [imapPassword, setImapPassword] = useState("");

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

  const profileDirty = displayName !== data.user.displayName || email !== data.user.email;
  const mailDirty = imapUsername !== data.mail.imapUsername || imapPassword.length > 0;

  const saveProfile = async () => {
    try {
      const password = newPassword.trim();
      if (password.length > 0 && password.length < 8) {
        toast.error("Password must be at least 8 characters");
        return;
      }
      if (password.length > 0 && password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }
      await operations?.saveProfile({ displayName, email, password: password || undefined });
      setNewPassword("");
      setConfirmPassword("");
      toast("Profile saved", { icon: <Check className="size-4" /> });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save profile";
      toast.error(message);
    }
  };

  const saveMail = async () => {
    try {
      await operations?.saveMail({ imapUsername, imapPassword });
      setImapPassword("");
      toast("Mail credentials saved", { icon: <Check className="size-4" /> });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not save mail credentials";
      toast.error(message);
    }
  };

  return {
    section,
    sections,
    currentSection,
    sidebarOpen,
    setSidebarOpen,
    selectSection,
    profile: {
      username: data.user.username,
      displayName,
      email,
      newPassword,
      confirmPassword,
      profileDirty,
      setDisplayName,
      setEmail,
      setNewPassword,
      setConfirmPassword,
      saveProfile,
    },
    memberships: data.groups,
    mail: {
      imapUsername,
      imapPassword,
      mailDirty,
      imapHasPassword: data.mail.imapHasPassword,
      server: data.mailServer,
      setImapUsername,
      setImapPassword,
      saveMail,
    },
  };
}
