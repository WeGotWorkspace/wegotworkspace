import { useEffect, useMemo, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { useRunWithAppToast } from "@/hooks/use-run-with-app-toast";
import {
  settingsMailFormSchema,
  type SettingsMailFormValues,
} from "@/settings-core/src/settings-mail-form-schema";
import {
  settingsProfileFormSchema,
  type SettingsProfileFormValues,
} from "@/settings-core/src/settings-profile-form-schema";
import type { SettingsSection } from "@/settings-core/src/settings-types";
import type { SettingsWorkspaceProps } from "@/settings-core/src/settings-workspace-props";
import { useSettingsSidebarModel } from "@/settings-core/src/use-settings-sidebar-model";

export function useSettingsController({
  data,
  operations,
}: Pick<SettingsWorkspaceProps, "data" | "operations">) {
  const runWithAppToast = useRunWithAppToast();
  const [section, setSection] = useState<SettingsSection>("profile");
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const profileForm = useForm<SettingsProfileFormValues>({
    resolver: zodResolver(settingsProfileFormSchema),
    defaultValues: {
      displayName: data.user.displayName,
      email: data.user.email,
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onSubmit",
  });

  const { reset: resetProfile } = profileForm;

  useEffect(() => {
    resetProfile({
      displayName: data.user.displayName,
      email: data.user.email,
      newPassword: "",
      confirmPassword: "",
    });
  }, [data.user.displayName, data.user.email, resetProfile]);

  const mailForm = useForm<SettingsMailFormValues>({
    resolver: zodResolver(settingsMailFormSchema),
    defaultValues: {
      imapUsername: data.mail.imapUsername,
      imapPassword: "",
    },
    mode: "onSubmit",
  });

  const { reset: resetMail } = mailForm;

  useEffect(() => {
    resetMail({
      imapUsername: data.mail.imapUsername,
      imapPassword: "",
    });
  }, [data.mail.imapUsername, resetMail]);

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

  const saveProfile = profileForm.handleSubmit(async (values) => {
    await runWithAppToast(
      async () => {
        await operations?.saveProfile({
          displayName: values.displayName,
          email: values.email,
          password: values.newPassword.trim() || undefined,
        });
        resetProfile({
          ...values,
          newPassword: "",
          confirmPassword: "",
        });
      },
      {
        success: "Profile saved",
        successOptions: { icon: <Check className="size-4" /> },
        mapError: (error) => (error instanceof Error ? error.message : "Could not save profile"),
      },
    );
  });

  const saveMail = mailForm.handleSubmit(async (values) => {
    await runWithAppToast(
      async () => {
        await operations?.saveMail({
          imapUsername: values.imapUsername,
          imapPassword: values.imapPassword,
        });
        resetMail({
          ...values,
          imapPassword: "",
        });
      },
      {
        success: "Mail credentials saved",
        successOptions: { icon: <Check className="size-4" /> },
        mapError: (error) =>
          error instanceof Error ? error.message : "Could not save mail credentials",
      },
    );
  });

  return {
    section,
    sections,
    currentSection,
    sidebarOpen,
    setSidebarOpen,
    selectSection,
    profile: {
      username: data.user.username,
      form: profileForm,
      saveProfile,
    },
    memberships: data.groups,
    mail: {
      form: mailForm,
      saveMail,
      imapHasPassword: data.mail.imapHasPassword,
      server: data.mailServer,
      savedImapUsername: data.mail.imapUsername,
    },
  };
}

export type SettingsControllerState = ReturnType<typeof useSettingsController>;
