import type { SettingsMailRequest } from "@wgw-api-generated/settings-types";
import { settingsMailRequestOpenapiSchema } from "@wgw-api-generated/settings-request-zod";
import { z } from "zod";

/**
 * IMAP credentials editor. Wire body is checked with
 * {@link settingsMailRequestOpenapiSchema} in {@link settingsMailFormToRequest}.
 */
export const settingsMailFormSchema = z.object({
  imapUsername: z.string().trim().min(1, "Username is required"),
  imapPassword: z.string(),
});

export type SettingsMailFormValues = z.infer<typeof settingsMailFormSchema>;

export function settingsMailFormToRequest(values: SettingsMailFormValues): SettingsMailRequest {
  return settingsMailRequestOpenapiSchema.parse({
    imapUsername: values.imapUsername,
    imapPassword: values.imapPassword,
  }) as SettingsMailRequest;
}
