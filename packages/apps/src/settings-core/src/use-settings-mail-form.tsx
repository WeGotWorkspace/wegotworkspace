import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Check } from "lucide-react";
import { useForm } from "react-hook-form";
import { useRunWithAppToast } from "@/hooks/use-run-with-app-toast";
import {
  settingsMailFormSchema,
  settingsMailFormToRequest,
  type SettingsMailFormValues,
} from "@/settings-core/src/settings-mail-form-schema";
import type {
  SettingsAPIOperations,
  SettingsMailCredentials,
  SettingsMailServer,
} from "@/settings-core/src/settings-types";

export function useSettingsMailForm({
  mail,
  mailServer,
  operations,
}: {
  mail: SettingsMailCredentials;
  mailServer: SettingsMailServer;
  operations?: SettingsAPIOperations;
}) {
  const runWithAppToast = useRunWithAppToast();
  const mailForm = useForm<SettingsMailFormValues>({
    resolver: zodResolver(settingsMailFormSchema),
    defaultValues: {
      imapUsername: mail.imapUsername,
      imapPassword: "",
    },
    mode: "onSubmit",
  });

  const { reset } = mailForm;

  useEffect(() => {
    reset({
      imapUsername: mail.imapUsername,
      imapPassword: "",
    });
  }, [mail.imapUsername, reset]);

  const saveMail = mailForm.handleSubmit(async (values) => {
    const requestBody = settingsMailFormToRequest(values);
    await runWithAppToast(
      async () => {
        await operations?.saveMail(requestBody);
        reset({
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
    form: mailForm,
    saveMail,
    imapHasPassword: mail.imapHasPassword,
    server: mailServer,
    savedImapUsername: mail.imapUsername,
  };
}

export type SettingsMailFormController = ReturnType<typeof useSettingsMailForm>;
