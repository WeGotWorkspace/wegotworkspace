import { z } from "zod";

/** IMAP credentials editor for settings mail pane. */
export const settingsMailFormSchema = z.object({
  imapUsername: z.string().trim().min(1, "Username is required"),
  imapPassword: z.string(),
});

export type SettingsMailFormValues = z.infer<typeof settingsMailFormSchema>;
