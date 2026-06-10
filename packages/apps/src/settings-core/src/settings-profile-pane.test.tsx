import { fireEvent, render, screen } from "@testing-library/react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { describe, expect, it } from "vitest";
import { SettingsProfilePane } from "@/settings-core/src/settings-profile-pane";
import {
  settingsProfileFormSchema,
  type SettingsProfileFormValues,
} from "@/settings-core/src/settings-profile-form-schema";

function ProfilePaneHarness() {
  const form = useForm<SettingsProfileFormValues>({
    resolver: zodResolver(settingsProfileFormSchema),
    defaultValues: {
      displayName: "Demo User",
      email: "demo@example.test",
      newPassword: "",
      confirmPassword: "",
    },
    mode: "onSubmit",
  });

  return (
    <SettingsProfilePane
      profile={{
        username: "demo.user",
        form,
        saveProfile: form.handleSubmit(async () => {}),
      }}
    />
  );
}

describe("SettingsProfilePane", () => {
  it("enables Save changes when display name is edited", () => {
    render(<ProfilePaneHarness />);

    const saveButton = screen.getByRole("button", { name: "Save changes" }) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);

    const displayName = screen.getByLabelText("Display name");
    fireEvent.change(displayName, { target: { value: "Updated name" } });

    expect(saveButton.disabled).toBe(false);
  });
});
