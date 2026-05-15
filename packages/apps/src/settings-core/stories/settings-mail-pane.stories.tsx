import { useEffect, useMemo } from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { SettingsMailPane } from "@/settings-core/src/settings-mail-pane";
import {
  settingsMailFormSchema,
  type SettingsMailFormValues,
} from "@/settings-core/src/settings-mail-form-schema";
import { getMailFormDefaults, getMailStoryMeta } from "./settings-panes.stories.fixtures";
import { settingsPaneDecorator } from "./settings-panes.stories.decorator";

type MailStoryVariant = "default" | "credentialsDirty" | "noSavedImapPassword";

function MailStoryHarness({ variant = "default" }: { variant?: MailStoryVariant }) {
  const storyMeta = useMemo(
    () => getMailStoryMeta(variant === "noSavedImapPassword" ? { imapHasPassword: false } : {}),
    [variant],
  );

  const form = useForm<SettingsMailFormValues>({
    resolver: zodResolver(settingsMailFormSchema),
    defaultValues: getMailFormDefaults(),
    mode: "onSubmit",
  });

  useEffect(() => {
    if (variant === "credentialsDirty") {
      form.setValue("imapUsername", "other@example.test", { shouldDirty: true });
    }
  }, [variant, form]);

  const mail = useMemo(
    () => ({
      ...storyMeta,
      form,
      saveMail: form.handleSubmit(async () => {}),
    }),
    [form, storyMeta],
  );

  return <SettingsMailPane mail={mail} />;
}

const meta = {
  title: "Apps/Settings/Panes/Mail",
  component: SettingsMailPane,
  decorators: [settingsPaneDecorator],
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SettingsMailPane>;

export default meta;
type Story = StoryObj<typeof SettingsMailPane>;

export const Default: Story = {
  render: () => <MailStoryHarness variant="default" />,
};

export const CredentialsDirty: Story = {
  render: () => <MailStoryHarness variant="credentialsDirty" />,
};

export const NoSavedImapPassword: Story = {
  render: () => <MailStoryHarness variant="noSavedImapPassword" />,
};
